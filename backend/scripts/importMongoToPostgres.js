const fs=require('fs');const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env')});
const {MongoClient}=require('mongodb');const {pool,newId,closeDatabase}=require('../database');
const value=(v)=>v&&typeof v==='object'&&v._id!==undefined?String(v._id):v===undefined?null:v;
const id=(v)=>value(v)?String(value(v)):null;
const timestamp=(v)=>v?new Date(v):new Date();
const json=(v,fallback)=>JSON.stringify(v??fallback);
const write=async(client,table,columns,values)=>{
    const markers=columns.map((_,i)=>`$${i+1}`).join(',');
    await client.query(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${markers}) ON CONFLICT(id) DO NOTHING`,values);
};
const getCollection=async(db,...names)=>{for(const name of names){const exists=await db.listCollections({name},{nameOnly:true}).hasNext();if(exists)return db.collection(name);}return null;};
const rows=async(db,...names)=>{const collection=await getCollection(db,...names);return collection?collection.find({}).toArray():[];};
const insertStudent=async(client,doc)=>{
    const sid=id(doc._id)||newId();const recordType=['student','employee'].includes(doc.recordType)?doc.recordType:'student';const roll=String(doc.roll||doc.employeeId||'').trim().toUpperCase();if(!roll)throw new Error(`Patient profile ${sid} has no campus ID; repair the source record before importing.`);
    await write(client,'students',['id','name','record_type','roll','employee_id','mobile_no','father_name','father_mobile','address','previous_health','age','blood_group','created_at','updated_at'],[sid,String(doc.name||'Unknown patient'),recordType,roll,String(doc.employeeId||''),String(doc.mobileNo||''),String(doc.fatherName||''),String(doc.fatherMobile||''),String(doc.address||''),String(doc.previous_health||''),doc.age===undefined?null:Number(doc.age),String(doc.bloodGroup||''),timestamp(doc.createdAt),timestamp(doc.updatedAt||doc.createdAt)]);
    return sid;
};
const run=async()=>{
    const mongoUri=process.env.MONGO_MIGRATION_URI||process.env.MONGO_URI;if(!mongoUri)throw new Error('Set MONGO_MIGRATION_URI in backend/.env to the source MongoDB database for this one-time import.');if(!process.env.DATABASE_URL)throw new Error('Set DATABASE_URL to the target PostgreSQL database.');
    const schema=fs.readFileSync(path.join(__dirname,'..','migrations','001_initial.sql'),'utf8');await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');await pool.query(schema);await pool.query("INSERT INTO schema_migrations(version) VALUES('001_initial.sql') ON CONFLICT(version) DO NOTHING");
    const mongo=new MongoClient(mongoUri);await mongo.connect();const db=mongo.db();let client;const counts={};
    try{client=await pool.connect();}catch(error){await mongo.close();throw error;}
    try{
        await client.query('BEGIN');
        for(const doc of await rows(db,'students')){await insertStudent(client,doc);counts.students=(counts.students||0)+1;}
        const users=await rows(db,'users');
        for(const u of users){if(!['student','employee'].includes(u.role))continue;let studentId=id(u.studentId);if(studentId){const found=await client.query('SELECT id FROM students WHERE id=$1',[studentId]);if(!found.rowCount){const profile={...u,_id:studentId,recordType:u.role,roll:u.roll||u.employeeId,employeeId:u.employeeId||''};await insertStudent(client,profile);counts.students=(counts.students||0)+1;}}
            else if(u.roll||u.employeeId){studentId=`legacy-${id(u._id)||newId()}`;await insertStudent(client,{...u,_id:studentId,recordType:u.role,roll:u.roll||u.employeeId,employeeId:u.employeeId||''});counts.students=(counts.students||0)+1;}
        }
        for(const u of users){const uid=id(u._id)||newId(),studentId=id(u.studentId)||(u.roll||u.employeeId?`legacy-${uid}`:null);const profile=studentId?(await client.query('SELECT id FROM students WHERE id=$1',[studentId])).rows[0]:null;if(['student','employee'].includes(u.role)&&!profile){console.warn(`Skipped patient login ${uid}: no profile/campus ID to link.`);continue;}
            await write(client,'users',['id','name','role','auth_version','email','password','student_id','designation','mobile_no','is_active','created_at','updated_at'],[uid,u.name||null,u.role||'student',Number(u.authVersion||0),String(u.email||'').trim().toLowerCase(),String(u.password||''),profile?.id||null,String(u.designation||''),String(u.mobileNo||''),u.isActive!==false,timestamp(u.createdAt),timestamp(u.updatedAt||u.createdAt)]);counts.users=(counts.users||0)+1;
        }
        for(const m of await rows(db,'medicines')){await write(client,'medicines',['id','name','quantity','usage','added_by','created_at','updated_at'],[id(m._id)||newId(),String(m.name||'Unnamed medicine'),Number(m.quantity||0),String(m.usage||''),id(m.addedBy),timestamp(m.createdAt),timestamp(m.updatedAt||m.createdAt)]);counts.medicines=(counts.medicines||0)+1;}
        for(const h of await rows(db,'histories')){await write(client,'histories',['id','roll','student','symptoms','medicines','created_at','updated_at'],[id(h._id)||newId(),String(h.roll||''),id(h.student),String(h.symptoms||''),json(h.medicines,[]),timestamp(h.createdAt),timestamp(h.updatedAt||h.createdAt)]);counts.histories=(counts.histories||0)+1;}
        for(const c of await rows(db,'consultations')){const vitals=c.vitals||{};await write(client,'consultations',['id','student_id','doctor_id','visit_at','chief_complaint','symptoms','vitals','diagnosis','doctor_advice','precautions','follow_up_at','idempotency_key','clinical_notes','legacy_history_id','created_at','updated_at'],[id(c._id)||newId(),id(c.studentId),id(c.doctorId),timestamp(c.visitAt),String(c.chiefComplaint||''),String(c.symptoms||''),json(vitals,{}),String(c.diagnosis||''),String(c.doctorAdvice||''),String(c.precautions||''),c.followUpAt?timestamp(c.followUpAt):null,c.idempotencyKey||null,String(c.clinicalNotes||''),id(c.legacyHistoryId),timestamp(c.createdAt),timestamp(c.updatedAt||c.createdAt)]);counts.consultations=(counts.consultations||0)+1;}
        for(const p of await rows(db,'prescriptions')){await write(client,'prescriptions',['id','consultation_id','medicine_id','medicine_name','dosage','frequency','duration','dispensed_quantity','legacy_history_id','legacy_item_index','created_at','updated_at'],[id(p._id)||newId(),id(p.consultationId),id(p.medicineId),String(p.medicineName||p.name||'Unknown medicine'),String(p.dosage||''),String(p.frequency||''),String(p.duration||''),Number(p.dispensedQuantity||0),id(p.legacyHistoryId),p.legacyItemIndex??null,timestamp(p.createdAt),timestamp(p.updatedAt||p.createdAt)]);counts.prescriptions=(counts.prescriptions||0)+1;}
        for(const a of await rows(db,'audit_logs','auditlogs')){await write(client,'audit_logs',['id','actor_id','action','consultation_id','student_id','changed_fields','created_at'],[id(a._id)||newId(),id(a.actorId),a.action==='consultation.updated'?'consultation.updated':'consultation.created',id(a.consultationId),id(a.studentId),a.changedFields||[],timestamp(a.createdAt)]);counts.audit_logs=(counts.audit_logs||0)+1;}
        for(const f of await rows(db,'facilities')){await write(client,'facilities',['id','title','description','added_by','created_at','updated_at'],[id(f._id)||newId(),String(f.title||''),String(f.description||''),id(f.addedBy),timestamp(f.createdAt),timestamp(f.updatedAt||f.createdAt)]);counts.facilities=(counts.facilities||0)+1;}
        for(const h of await rows(db,'nearbyhospitals','nearby_hospitals')){await write(client,'nearby_hospitals',['id','name','address','contact','added_by','created_at','updated_at'],[id(h._id)||newId(),String(h.name||''),String(h.address||''),String(h.contact||''),id(h.addedBy),timestamp(h.createdAt),timestamp(h.updatedAt||h.createdAt)]);counts.nearby_hospitals=(counts.nearby_hospitals||0)+1;}
        for(const n of await rows(db,'notifications')){await write(client,'notifications',['id','title','added_by','created_at','updated_at'],[id(n._id)||newId(),String(n.title||''),id(n.addedBy),timestamp(n.createdAt),timestamp(n.updatedAt||n.createdAt)]);counts.notifications=(counts.notifications||0)+1;}
        for(const g of await rows(db,'gallaries','galleries')){await write(client,'galleries',['id','link','added_by','created_at','updated_at'],[id(g._id)||newId(),String(g.link||''),id(g.addedBy),timestamp(g.createdAt),timestamp(g.updatedAt||g.createdAt)]);counts.galleries=(counts.galleries||0)+1;}
        await client.query('COMMIT');console.log('MongoDB records imported into PostgreSQL. Source was not modified. Import counts:',JSON.stringify(counts));
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();await mongo.close();}
};
run().catch(e=>{console.error('MongoDB import failed. PostgreSQL transaction rolled back:',e.message);process.exitCode=1;}).finally(closeDatabase);
