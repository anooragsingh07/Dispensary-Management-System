const { query, withTransaction, newId, isId, asApi } = require('../database');

const textField=(body,key,max,required=false)=>{const v=body[key]===undefined||body[key]===null?'':body[key];if(typeof v!=='string')return{error:`${key} must be text`};const value=v.trim();if(value.length>max)return{error:`${key} must be ${max} characters or fewer`};if(required&&!value)return{error:`${key} is required`};return{value};};
const optionalNumber=(v,label,min,max)=>{if(v===''||v===undefined||v===null)return{value:undefined};const number=Number(v);if(!Number.isFinite(number)||number<min||number>max)return{error:`${label} must be between ${min} and ${max}`};return{value:number};};
const validateConsultation=(body)=>{
    const result={};const limits={chiefComplaint:[500,true],symptoms:[2000,false],diagnosis:[2000,true],doctorAdvice:[2000,false],precautions:[2000,false],clinicalNotes:[4000,false]};
    for(const [key,[max,required]] of Object.entries(limits)){const field=textField(body,key,max,required);if(field.error)return field;result[key]=field.value;}
    const visitAt=new Date(body.visitAt||Date.now());if(!Number.isFinite(visitAt.getTime())||visitAt.getTime()>Date.now()+300000)return{error:'Enter a valid visit date and time that is not in the future'};result.visitAt=visitAt;
    const follow=body.followUpAt;if(follow){const date=new Date(follow);if(!Number.isFinite(date.getTime()))return{error:'Enter a valid follow-up date'};result.followUpAt=date;}else result.followUpAt=null;
    const vitals=body.vitals||{};if(typeof vitals!=='object'||Array.isArray(vitals))return{error:'Vitals must be an object'};
    const temperature=optionalNumber(vitals.temperatureC,'Temperature',20,50),pulse=optionalNumber(vitals.pulseBpm,'Pulse',1,300);if(temperature.error)return temperature;if(pulse.error)return pulse;
    const bp=textField(vitals,'bloodPressure',24),other=textField(vitals,'other',1000);if(bp.error)return bp;if(bp.value&&!/^\d{2,3}\s*\/\s*\d{2,3}$/.test(bp.value))return{error:'Blood pressure must use the format 120/80'};if(other.error)return other;
    result.vitals={...(temperature.value===undefined?{}:{temperatureC:temperature.value}),...(pulse.value===undefined?{}:{pulseBpm:pulse.value}),bloodPressure:bp.value,other:other.value};return{value:result};
};
const validatePrescriptions=(rows)=>{
    if(rows===undefined)return{value:[]};if(!Array.isArray(rows)||rows.length>30)return{error:'Prescriptions must contain no more than 30 medicines'};const value=[];
    for(const [i,row] of rows.entries()){
        if(!row||typeof row!=='object'||Array.isArray(row))return{error:`Medicine ${i+1} is invalid`};const medicineId=row.medicineId||row._id||null;if(medicineId&&!isId(medicineId))return{error:`Medicine ${i+1} has an invalid stock item`};
        const fields={};for(const [key,max] of [['medicineName',160],['dosage',200],['frequency',120],['duration',120]]){const f=textField(row,key,max,true);if(f.error)return{error:`Medicine ${i+1}: ${f.error}`};fields[key]=f.value;}
        const quantity=row.dispensedQuantity===undefined||row.dispensedQuantity===''||row.dispensedQuantity===null?0:Number(row.dispensedQuantity);if(!Number.isSafeInteger(quantity)||quantity<0||quantity>1000000)return{error:`Medicine ${i+1} must have a valid whole-number dispense quantity`};if(quantity>0&&!medicineId)return{error:`Medicine ${i+1} must be selected from stock to dispense a quantity`};value.push({...fields,medicineId,dispensedQuantity:quantity});
    }return{value};
};

const apiPatient=(row)=>row?asApi(row):null;
const apiVisit=(row)=>{const visit=asApi(row);if(row.patient)visit.studentId=apiPatient(row.patient);else visit.studentId=row.student_id;if(row.doctor)visit.doctorId=asApi(row.doctor);else visit.doctorId=row.doctor_id;delete visit.patient;delete visit.doctor;return visit;};
const visitSelect=`SELECT c.*,row_to_json(s) AS patient,CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('_id',u.id,'name',u.name,'email',u.email,'designation',u.designation) END AS doctor FROM consultations c JOIN students s ON s.id=c.student_id LEFT JOIN users u ON u.id=c.doctor_id`;
const getPrescriptions=async(client,ids)=>{
    if(!ids.length)return[];const rows=(await client.query('SELECT * FROM prescriptions WHERE consultation_id = ANY($1::text[]) ORDER BY created_at',[ids])).rows;return rows.map(asApi);
};
const attachPrescriptions=async(rows)=>{
    const prescriptions=await getPrescriptions({query},rows.map(r=>r.id));const grouped=new Map();
    for(const p of prescriptions){const key=String(p.consultationId);grouped.set(key,[...(grouped.get(key)||[]),p]);}
    return rows.map(row=>({...apiVisit(row),prescriptions:grouped.get(String(row.id))||[]}));
};

exports.createConsultation=async(req,res)=>{
    try{
        const body=req.body||{},key=String(body.idempotencyKey||'').trim();if(!/^[a-zA-Z0-9._:-]{8,80}$/.test(key))return res.status(400).json({error:'A valid consultation request key is required'});
        if(!isId(body.studentId))return res.status(400).json({error:'Choose a valid student'});
        const clinical=validateConsultation(body);if(clinical.error)return res.status(400).json({error:clinical.error});const prescriptionInput=validatePrescriptions(body.prescriptions);if(prescriptionInput.error)return res.status(400).json({error:prescriptionInput.error});
        const saveResult=await withTransaction(async(client)=>{
            const existing=(await client.query('SELECT id FROM consultations WHERE doctor_id=$1 AND idempotency_key=$2',[req.user._id,key])).rows[0];if(existing)return{id:existing.id,duplicate:true};
            const patient=(await client.query('SELECT id FROM students WHERE id=$1',[body.studentId])).rows[0];if(!patient)throw Object.assign(new Error('Student not found'),{status:404});
            const resolved=[];
            for(const item of prescriptionInput.value){let medicineName=item.medicineName;
                if(item.medicineId){
                    if(item.dispensedQuantity>0){const updated=await client.query('UPDATE medicines SET quantity=quantity-$2,updated_at=now() WHERE id=$1 AND quantity >= $2 RETURNING name',[item.medicineId,item.dispensedQuantity]);
                        if(!updated.rowCount){const exists=await client.query('SELECT id FROM medicines WHERE id=$1',[item.medicineId]);throw Object.assign(new Error(exists.rowCount?'There is not enough stock for a selected medicine':'A selected stock item no longer exists'),{status:409});}medicineName=updated.rows[0].name;
                    }else{const stock=(await client.query('SELECT name FROM medicines WHERE id=$1',[item.medicineId])).rows[0];if(!stock)throw Object.assign(new Error('A selected stock item no longer exists'),{status:409});medicineName=stock.name;}
                }
                resolved.push({...item,medicineName});
            }
            const cid=newId();const c=clinical.value;
            await client.query(`INSERT INTO consultations(id,student_id,doctor_id,visit_at,chief_complaint,symptoms,vitals,diagnosis,doctor_advice,precautions,follow_up_at,idempotency_key,clinical_notes)
                VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)`,[cid,patient.id,req.user._id,c.visitAt,c.chiefComplaint,c.symptoms,JSON.stringify(c.vitals),c.diagnosis,c.doctorAdvice,c.precautions,c.followUpAt,key,c.clinicalNotes]);
            for(const p of resolved)await client.query(`INSERT INTO prescriptions(id,consultation_id,medicine_id,medicine_name,dosage,frequency,duration,dispensed_quantity) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[newId(),cid,p.medicineId,p.medicineName,p.dosage,p.frequency,p.duration,p.dispensedQuantity]);
            await client.query('INSERT INTO audit_logs(id,actor_id,action,consultation_id,student_id,changed_fields) VALUES($1,$2,$3,$4,$5,$6)',[newId(),req.user._id,'consultation.created',cid,patient.id,Object.keys(c).filter(k=>k!=='clinicalNotes')]);return{id:cid,duplicate:false};
        });
        const row=(await query(`${visitSelect} WHERE c.id=$1`,[saveResult.id])).rows[0];const [visit]=await attachPrescriptions([row]);
        return res.status(saveResult.duplicate?200:201).json({message:saveResult.duplicate?'This consultation was already saved':'Consultation saved',consultation:visit});
    }catch(error){
        if(error.code==='23505'&&req.body?.idempotencyKey){const row=(await query(`${visitSelect} WHERE c.doctor_id=$1 AND c.idempotency_key=$2`,[req.user._id,String(req.body.idempotencyKey).trim()])).rows[0];if(row){const [visit]=await attachPrescriptions([row]);return res.status(200).json({message:'This consultation was already saved',consultation:visit});}}
        if(error.status)return res.status(error.status).json({error:error.message});console.error('Consultation creation failed:',error.message);return res.status(500).json({error:'Unable to save this consultation right now. No stock or visit changes were committed.'});
    }
};

exports.getStudentConsultations=async(req,res)=>{
    try{if(!isId(req.params.studentId))return res.status(400).json({error:'Enter a valid student ID'});const student=await query('SELECT id FROM students WHERE id=$1',[req.params.studentId]);if(!student.rowCount)return res.status(404).json({error:'Student not found'});const rows=(await query(`${visitSelect} WHERE c.student_id=$1 ORDER BY c.visit_at DESC`,[req.params.studentId])).rows;return res.status(200).json({consultations:await attachPrescriptions(rows)});}
    catch(error){console.error('Patient consultation history failed:',error.message);return res.status(500).json({error:'Unable to load this patient’s consultations right now'});}
};
exports.getMyConsultations=async(req,res)=>{
    try{const studentId=req.user.studentId?._id||req.user.studentId;if(!studentId)return res.status(403).json({error:'Your account is not linked to a patient profile'});const rows=(await query(`${visitSelect} WHERE c.student_id=$1 ORDER BY c.visit_at DESC`,[studentId])).rows;const visits=await attachPrescriptions(rows);for(const visit of visits){delete visit.clinicalNotes;if(visit.doctorId)visit.doctorId={_id:visit.doctorId._id,name:visit.doctorId.name,designation:visit.doctorId.designation};}return res.status(200).json({consultations:visits});}
    catch(error){console.error('Patient consultation history failed:',error.message);return res.status(500).json({error:'Unable to load your consultations right now'});}
};
exports.getConsultationsByDate=async(req,res)=>{
    try{let params=[];let where='';const {month,year}=req.query;if(month||year){const m=Number(month),y=Number(year);if(!Number.isInteger(m)||m<1||m>12||!Number.isInteger(y)||y<2000||y>new Date().getFullYear()+1)return res.status(400).json({error:'Select a valid month and year'});where='WHERE c.visit_at >= $1 AND c.visit_at < $2';params=[new Date(y,m-1,1),new Date(y,m,1)];}const rows=(await query(`${visitSelect} ${where} ORDER BY c.visit_at DESC`,params)).rows;return res.status(200).json({consultations:await attachPrescriptions(rows)});}
    catch(error){console.error('Consultations list failed:',error.message);return res.status(500).json({error:'Unable to load consultations right now'});}
};
exports.updateConsultation=async(req,res)=>{
    try{
        if(!isId(req.params.id))return res.status(400).json({error:'Enter a valid consultation ID'});const body=req.body||{};if(body.prescriptions!==undefined)return res.status(400).json({error:'Prescription items are immutable after saving; create a new consultation to record changes'});
        const original=(await query('SELECT * FROM consultations WHERE id=$1',[req.params.id])).rows[0];if(!original)return res.status(404).json({error:'Consultation not found'});
        if(req.user.role==='doctor'&&original.doctor_id!==req.user._id)return res.status(403).json({error:'Doctors can edit only consultations they created'});if(req.user.role==='staff')return res.status(403).json({error:'Only a doctor or administrator can edit clinical records'});
        const clinical=validateConsultation({visitAt:body.visitAt??original.visit_at,chiefComplaint:body.chiefComplaint??original.chief_complaint,symptoms:body.symptoms??original.symptoms,vitals:body.vitals??original.vitals,diagnosis:body.diagnosis??original.diagnosis,doctorAdvice:body.doctorAdvice??original.doctor_advice,precautions:body.precautions??original.precautions,followUpAt:body.followUpAt===undefined?original.follow_up_at:body.followUpAt,clinicalNotes:body.clinicalNotes??original.clinical_notes});if(clinical.error)return res.status(400).json({error:clinical.error});
        const c=clinical.value;const changed=Object.entries({visitAt:'visit_at',chiefComplaint:'chief_complaint',symptoms:'symptoms',vitals:'vitals',diagnosis:'diagnosis',doctorAdvice:'doctor_advice',precautions:'precautions',followUpAt:'follow_up_at',clinicalNotes:'clinical_notes'}).filter(([key,col])=>JSON.stringify(c[key])!==JSON.stringify(original[col])).map(([key])=>key);
        await withTransaction(async(client)=>{await client.query(`UPDATE consultations SET visit_at=$2,chief_complaint=$3,symptoms=$4,vitals=$5::jsonb,diagnosis=$6,doctor_advice=$7,precautions=$8,follow_up_at=$9,clinical_notes=$10,updated_at=now() WHERE id=$1`,[req.params.id,c.visitAt,c.chiefComplaint,c.symptoms,JSON.stringify(c.vitals),c.diagnosis,c.doctorAdvice,c.precautions,c.followUpAt,c.clinicalNotes]);if(changed.length)await client.query('INSERT INTO audit_logs(id,actor_id,action,consultation_id,student_id,changed_fields) VALUES($1,$2,$3,$4,$5,$6)',[newId(),req.user._id,'consultation.updated',req.params.id,original.student_id,changed]);});
        const row=(await query(`${visitSelect} WHERE c.id=$1`,[req.params.id])).rows[0];const [visit]=await attachPrescriptions([row]);return res.status(200).json({message:'Consultation updated',consultation:visit});
    }catch(error){console.error('Consultation update failed:',error.message);return res.status(500).json({error:'Unable to update this consultation right now'});}
};
exports._validation={validateConsultation,validatePrescriptions};
