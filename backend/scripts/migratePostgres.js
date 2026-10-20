const fs=require('fs');const path=require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env')});
const {pool,closeDatabase}=require('../database');

const run=async()=>{
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const directory=path.join(__dirname,'..','migrations');const files=fs.readdirSync(directory).filter((name)=>/^\d+.*\.sql$/.test(name)).sort();
    for(const file of files){const client=await pool.connect();try{
        await client.query('BEGIN');const exists=await client.query('SELECT version FROM schema_migrations WHERE version=$1',[file]);if(exists.rowCount){await client.query('COMMIT');continue;}
        await client.query(fs.readFileSync(path.join(directory,file),'utf8'));await client.query('INSERT INTO schema_migrations(version) VALUES($1)',[file]);await client.query('COMMIT');console.log(`Applied PostgreSQL migration ${file}`);
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}}
    console.log('PostgreSQL schema is current.');
};

run().catch((error)=>{console.error('PostgreSQL migration failed:',error.message);process.exitCode=1;}).finally(closeDatabase);
