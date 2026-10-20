const { query, newId, isId, asApi } = require('../database');
const clean=(v)=>String(v||'').trim();
const validQuantity=(v)=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))&&Number(v)>=0;
const listSql=`SELECT m.*, CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object('_id',u.id,'name',u.name) END AS added_by_profile FROM medicines m LEFT JOIN users u ON u.id=m.added_by`;
const toMedicine=(row)=>{const item=asApi(row);item.addedBy=row.added_by_profile||row.added_by;delete item.addedByProfile;return item;};

exports.addMedicine=async(req,res)=>{
    try{const b=req.body||{},name=clean(b.name),usage=clean(b.usage);if(!name||name.length>160||!usage||usage.length>1000||!validQuantity(b.quantity))return res.status(400).json({error:'Enter a name, a valid quantity of zero or more, and usage instructions'});const row=(await query('INSERT INTO medicines(id,name,quantity,usage,added_by) VALUES($1,$2,$3,$4,$5) RETURNING *',[newId(),name,Number(b.quantity),usage,req.user._id])).rows[0];row.added_by_profile={_id:req.user._id,name:req.user.name};return res.status(201).json({message:'Medicine added to stock',medicine:toMedicine(row)});}
    catch(error){console.error('Medicine creation failed:',error.message);return res.status(500).json({error:'Unable to add this medicine right now'});}
};
const getMedicineList=async(name='')=>{const params=[];let where='';if(name){params.push(`%${name}%`);where='WHERE m.name ILIKE $1';}const rows=(await query(`${listSql} ${where} ORDER BY m.name`,params)).rows;return rows.map(toMedicine);};
exports.getMedicine=async(_req,res)=>{try{return res.status(200).json({medicines:await getMedicineList()});}catch(error){console.error('Medicine list failed:',error.message);return res.status(500).json({error:'Unable to load medicine stock right now'});}};
exports.searchMedicine=async(req,res)=>{try{return res.status(200).json({medicines:await getMedicineList(clean(req.query.name))});}catch(error){console.error('Medicine search failed:',error.message);return res.status(500).json({error:'Unable to search medicine stock right now'});}};
exports.updateMedicineById=async(req,res)=>{
    try{if(!isId(req.params.id))return res.status(404).json({error:'Medicine not found'});const b=req.body||{},updates=[];const values=[req.params.id];
        for(const [field,column,max] of [['name','name',160],['usage','usage',1000]])if(b[field]!==undefined){const v=clean(b[field]);if(!v||v.length>max)return res.status(400).json({error:`${field==='usage'?'Usage instructions':'Medicine name'} are required and must be under ${max} characters`});values.push(v);updates.push(`${column}=$${values.length}`);}
        if(b.quantity!==undefined){if(!validQuantity(b.quantity))return res.status(400).json({error:'Quantity must be a valid number of zero or more'});values.push(Number(b.quantity));updates.push(`quantity=$${values.length}`);}
        if(!updates.length)return res.status(400).json({error:'Provide at least one field to update'});
        const row=(await query(`UPDATE medicines SET ${updates.join(',')},updated_at=now() WHERE id=$1 RETURNING *`,values)).rows[0];if(!row)return res.status(404).json({error:'Medicine not found'});const by=(await query('SELECT id,name FROM users WHERE id=$1',[row.added_by])).rows[0];row.added_by_profile=by?{_id:by.id,name:by.name}:null;return res.status(200).json({message:'Medicine details updated',medicine:toMedicine(row)});
    }catch(error){console.error('Medicine update failed:',error.message);return res.status(500).json({error:'Unable to update this medicine right now'});}
};
exports.deleteMedicineById=async(req,res)=>{try{if(!isId(req.params.id))return res.status(404).json({error:'Medicine not found'});const result=await query('DELETE FROM medicines WHERE id=$1 RETURNING id',[req.params.id]);if(!result.rowCount)return res.status(404).json({error:'Medicine not found'});return res.status(200).json({message:'Medicine removed from stock'});}catch(error){console.error('Medicine removal failed:',error.message);return res.status(500).json({error:'Unable to remove this medicine right now'});}};
