const test=require('node:test');const assert=require('node:assert/strict');const path=require('path');const crypto=require('crypto');
require('dotenv').config({path:path.join(__dirname,'..','.env')});
const testUrl=process.env.TEST_DATABASE_URL||'';let safe=false;try{safe=/test/i.test(decodeURIComponent(new URL(testUrl).pathname.split('/').filter(Boolean)[0]||''));}catch{}

test('PostgreSQL registration, patient search, consultation, prescription, stock, history and role access',{skip:!safe},async()=>{
    process.env.DATABASE_URL=testUrl;process.env.NODE_ENV='test';process.env.JWT_SECRET=`integration-${crypto.randomBytes(32).toString('hex')}`;
    const {query,withTransaction,newId,closeDatabase}=require('../database');const schema=require('fs').readFileSync(path.join(__dirname,'..','migrations','001_initial.sql'),'utf8');await query(schema);
    const app=require('../index');const bcrypt=require('bcryptjs');const doctorId=newId(),medicineId=newId(),tag=crypto.randomBytes(5).toString('hex').toUpperCase(),roll=`TEST-${tag}`,employeeId=`EMP-${tag}`;let server;let studentId;let employeeStudentId;let studentUserId;let employeeUserId;
    try{
        await query('INSERT INTO users(id,name,email,password,role,designation) VALUES($1,$2,$3,$4,$5,$6)',[doctorId,'Integration Doctor',`doctor.${tag.toLowerCase()}@example.test`,await bcrypt.hash('integration-password-1',10),'doctor','Doctor']);
        await query('INSERT INTO medicines(id,name,quantity,usage,added_by) VALUES($1,$2,10,$3,$4)',[medicineId,`Integration Paracetamol ${tag}`,'Test fixture only',doctorId]);
        server=app.listen(0);await new Promise(resolve=>server.once('listening',resolve));const base=`http://127.0.0.1:${server.address().port}`;
        const request=async(url,init={})=>fetch(`${base}${url}`,{...init,headers:{'content-type':'application/json',...(init.headers||{})}});
        const register=async(data)=>{const response=await request('/api/auth/register',{method:'POST',body:JSON.stringify(data)});const payload=await response.json();assert.equal(response.status,201,JSON.stringify(payload));return{cookie:response.headers.get('set-cookie')?.split(';')[0],user:payload.user};};
        const student=await register({name:'Integration Patient',email:`patient.${tag.toLowerCase()}@example.test`,password:'patient-password-123',roll,mobileNo:'9000000001'});studentId=student.user.studentId;studentUserId=student.user._id;
        const employee=await register({name:'Integration Employee',email:`employee.${tag.toLowerCase()}@example.test`,password:'employee-password-123',accountType:'employee',employeeId,mobileNo:'9000000002'});employeeStudentId=employee.user.studentId;employeeUserId=employee.user._id;
        const login=await request('/api/auth/login',{method:'POST',body:JSON.stringify({email:`doctor.${tag.toLowerCase()}@example.test`,password:'integration-password-1'})});assert.equal(login.status,200);const doctorCookie=login.headers.get('set-cookie')?.split(';')[0];
        const search=await request(`/api/auth/get-student/${roll}`,{headers:{cookie:doctorCookie}});assert.equal(search.status,200);assert.equal((await search.json()).student._id,studentId);
        const key=`test-${tag}-consultation`;
        const body={idempotencyKey:key,studentId,visitAt:new Date().toISOString(),chiefComplaint:'Test headache',symptoms:'Synthetic integration fixture',vitals:{},diagnosis:'Test assessment',doctorAdvice:'Fixture only',prescriptions:[{medicineId,medicineName:'ignored stale name',dosage:'1 tablet',frequency:'Once',duration:'1 day',dispensedQuantity:2}]};
        const saved=await request('/api/consultations',{method:'POST',headers:{cookie:doctorCookie},body:JSON.stringify(body)});assert.equal(saved.status,201);const savedPayload=await saved.json();assert.equal(savedPayload.consultation.prescriptions.length,1);assert.match(savedPayload.consultation.prescriptions[0].medicineName,/Integration Paracetamol/);
        const count=(await query('SELECT quantity FROM medicines WHERE id=$1',[medicineId])).rows[0].quantity;assert.equal(Number(count),8);
        const retried=await request('/api/consultations',{method:'POST',headers:{cookie:doctorCookie},body:JSON.stringify(body)});assert.equal(retried.status,200);assert.equal(Number((await query('SELECT quantity FROM medicines WHERE id=$1',[medicineId])).rows[0].quantity),8);
        const history=await request('/api/consultations/mine',{headers:{cookie:student.cookie}});assert.equal(history.status,200);const visits=(await history.json()).consultations;assert.equal(visits.length,1);assert.equal('clinicalNotes' in visits[0],false);
        const denied=await request(`/api/consultations/student/${employeeStudentId}`,{headers:{cookie:student.cookie}});assert.equal(denied.status,403);
        const noStock={...body,idempotencyKey:`test-${tag}-insufficient`,prescriptions:[{medicineId,medicineName:'ignored',dosage:'1 tablet',frequency:'Once',duration:'1 day',dispensedQuantity:100}]};const rejected=await request('/api/consultations',{method:'POST',headers:{cookie:doctorCookie},body:JSON.stringify(noStock)});assert.equal(rejected.status,409);assert.equal(Number((await query('SELECT quantity FROM medicines WHERE id=$1',[medicineId])).rows[0].quantity),8);
        const employeeHistory=await request('/api/consultations/mine',{headers:{cookie:employee.cookie}});assert.equal(employeeHistory.status,200);assert.deepEqual((await employeeHistory.json()).consultations,[]);
        assert.equal(await query('SELECT count(*)::int AS count FROM audit_logs WHERE consultation_id=$1',[savedPayload.consultation._id]).then(r=>r.rows[0].count),1);
    }finally{
        if(server)await new Promise(resolve=>server.close(resolve));
        await withTransaction(async(client)=>{
            if(studentId||employeeStudentId){const ids=[studentId,employeeStudentId].filter(Boolean);await client.query('DELETE FROM audit_logs WHERE student_id=ANY($1::text[])', [ids]);await client.query('DELETE FROM consultations WHERE student_id=ANY($1::text[])',[ids]);}
            await client.query('DELETE FROM medicines WHERE id=$1',[medicineId]);
            await client.query('DELETE FROM users WHERE id=ANY($1::text[])',[[doctorId,studentUserId,employeeUserId].filter(Boolean)]);
            await client.query('DELETE FROM students WHERE id=ANY($1::text[])',[[studentId,employeeStudentId].filter(Boolean)]);
        }).catch(()=>{});
        await closeDatabase();
    }
});
