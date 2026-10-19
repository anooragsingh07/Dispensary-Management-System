import React, { useEffect, useState } from 'react';
import './report.css';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from '@/api/client';
import { ToastContainer, toast } from 'react-toastify';

const localDateTime = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const ConsultationForm = ({ studentDetail, showLoader, hideLoader, onCancel, onSaved }) => {
    const [search, setSearch] = useState('');
    const [matches, setMatches] = useState([]);
    const [selected, setSelected] = useState([]);
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        visitAt: localDateTime(), chiefComplaint: '', symptoms: '', temperatureC: '', bloodPressure: '', pulseBpm: '', otherVitals: '',
        diagnosis: '', doctorAdvice: '', precautions: '', followUpAt: '', clinicalNotes: '',
    });

    useEffect(() => {
        if (!search.trim()) { setMatches([]); return undefined; }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const { data } = await axios.get('/api/medicine/search', { params: { name: search.trim() } });
                setMatches(data.medicines || []);
            } catch (error) {
                toast.error(error?.response?.data?.error || 'Unable to search medicine stock');
            } finally { setSearching(false); }
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    const addMedicine = (medicine) => {
        if (selected.some((item) => item.medicineId === medicine._id)) return toast.info('This medicine is already on the prescription');
        setSelected((current) => [...current, {
            key: medicine._id, medicineId: medicine._id, medicineName: medicine.name, stock: Number(medicine.quantity) || 0,
            dosage: '', frequency: '', duration: '', dispensedQuantity: '',
        }]);
        setSearch('');
        setMatches([]);
    };
    const addCustomMedicine = () => {
        const medicineName = search.trim();
        if (!medicineName) return;
        if (selected.some((item) => item.medicineName.toLowerCase() === medicineName.toLowerCase())) return toast.info('This medicine is already on the prescription');
        setSelected((current) => [...current, {
            key: `custom-${Date.now()}-${current.length}`, medicineId: null, medicineName, stock: 0,
            dosage: '', frequency: '', duration: '', dispensedQuantity: '',
        }]);
        setSearch('');
        setMatches([]);
    };
    const updateMedicine = (index, key, value) => setSelected((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item));
    const removeMedicine = (key) => setSelected((current) => current.filter((item) => item.key !== key));

    const submit = async (event) => {
        event.preventDefault();
        if (!studentDetail?._id) return toast.error('Search or register a student before starting a consultation');
        if (!form.chiefComplaint.trim()) return toast.error('Enter the chief complaint');
        if (!form.diagnosis.trim()) return toast.error('Enter the clinical assessment or diagnosis');
        for (const item of selected) {
            if (!item.dosage.trim() || !item.frequency.trim() || !item.duration.trim()) return toast.error(`Complete dosage, frequency and duration for ${item.medicineName}`);
            if (item.dispensedQuantity !== '' && (!Number.isSafeInteger(Number(item.dispensedQuantity)) || Number(item.dispensedQuantity) < 0 || Number(item.dispensedQuantity) > item.stock)) {
                return toast.error(`Dispense quantity for ${item.medicineName} must be between 0 and ${item.stock}`);
            }
        }
        setSaving(true);
        showLoader();
        try {
            const payload = {
                studentId: studentDetail._id,
                ...form,
                visitAt: new Date(form.visitAt).toISOString(),
                followUpAt: form.followUpAt ? new Date(`${form.followUpAt}T12:00:00`).toISOString() : null,
                vitals: {
                    temperatureC: form.temperatureC,
                    bloodPressure: form.bloodPressure,
                    pulseBpm: form.pulseBpm,
                    other: form.otherVitals,
                },
                prescriptions: selected.map(({ medicineId, medicineName, dosage, frequency, duration, dispensedQuantity }) => ({
                    medicineId, medicineName, dosage, frequency, duration,
                    dispensedQuantity: dispensedQuantity === '' ? 0 : Number(dispensedQuantity),
                })),
            };
            const { data } = await axios.post('/api/consultations', payload);
            toast.success(data.message || 'Consultation saved');
            onSaved?.(data.consultation);
        } catch (error) {
            toast.error(error?.response?.data?.error || 'Unable to save consultation');
        } finally {
            hideLoader();
            setSaving(false);
        }
    };

    return <form className="consultation-form" onSubmit={submit}>
        <section className="consultation-section">
            <h3>Visit details</h3>
            <div className="consultation-grid">
                <label>Visit date and time<input name="visitAt" type="datetime-local" value={form.visitAt} onChange={updateForm} required /></label>
                <label>Chief complaint<input name="chiefComplaint" maxLength="500" value={form.chiefComplaint} onChange={updateForm} placeholder="Main reason for today's visit" required /></label>
                <label className="consultation-full">Symptoms<textarea name="symptoms" maxLength="2000" rows="3" value={form.symptoms} onChange={updateForm} placeholder="Symptoms reported by the student" /></label>
            </div>
        </section>

        <section className="consultation-section">
            <h3>Measured vitals <small>Optional</small></h3>
            <div className="consultation-grid consultation-vitals">
                <label>Temperature (°C)<input name="temperatureC" type="number" min="20" max="50" step="0.1" value={form.temperatureC} onChange={updateForm} placeholder="e.g. 37" /></label>
                <label>Blood pressure<input name="bloodPressure" value={form.bloodPressure} onChange={updateForm} placeholder="e.g. 120/80" /></label>
                <label>Pulse (bpm)<input name="pulseBpm" type="number" min="1" max="300" value={form.pulseBpm} onChange={updateForm} placeholder="e.g. 72" /></label>
                <label>Other measurements<input name="otherVitals" maxLength="1000" value={form.otherVitals} onChange={updateForm} placeholder="e.g. oxygen saturation" /></label>
            </div>
        </section>

        <section className="consultation-section">
            <h3>Assessment and care</h3>
            <div className="consultation-grid">
                <label className="consultation-full">Clinical assessment / diagnosis<textarea name="diagnosis" maxLength="2000" rows="3" value={form.diagnosis} onChange={updateForm} placeholder="Assessment or diagnosis" required /></label>
                <label>Doctor's advice<textarea name="doctorAdvice" maxLength="2000" rows="3" value={form.doctorAdvice} onChange={updateForm} placeholder="Care advice" /></label>
                <label>Precautions<textarea name="precautions" maxLength="2000" rows="3" value={form.precautions} onChange={updateForm} placeholder="Precautions to follow" /></label>
                <label>Follow-up date<input name="followUpAt" type="date" value={form.followUpAt} onChange={updateForm} /></label>
            </div>
        </section>

        <section className="consultation-section">
            <h3>Prescription <small>Optional</small></h3>
            <label className="consultation-search-label">Add a medicine from current stock
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search medicine by name" autoComplete="off" />
            </label>
            {searching && <p className="consultation-hint">Searching medicine stock…</p>}
            {matches.length > 0 && <div className="consultation-matches">{matches.map((medicine) => <button type="button" key={medicine._id} onClick={() => addMedicine(medicine)}>{medicine.name}<span>{medicine.quantity} in stock</span></button>)}</div>}
            {search && !searching && matches.length === 0 && <div className="consultation-custom-medicine"><span>No matching stock item. You can still add this as a prescription-only medicine.</span><button type="button" className="button-secondary" onClick={addCustomMedicine}>Add “{search.trim()}”</button></div>}
            {selected.length > 0 && <div className="prescription-list">{selected.map((medicine, index) => <div className="prescription-row" key={medicine.key}>
                <div className="prescription-row-title"><strong>{medicine.medicineName}</strong><small>{medicine.medicineId ? `${medicine.stock} in stock` : 'Prescription only'}</small><button type="button" className="icon-action icon-action-danger" aria-label={`Remove ${medicine.medicineName}`} onClick={() => removeMedicine(medicine.key)}><DeleteIcon /></button></div>
                <label>Dosage<input value={medicine.dosage} maxLength="200" onChange={(event) => updateMedicine(index, 'dosage', event.target.value)} placeholder="e.g. 1 tablet" required /></label>
                <label>Frequency<input value={medicine.frequency} maxLength="120" onChange={(event) => updateMedicine(index, 'frequency', event.target.value)} placeholder="e.g. twice daily" required /></label>
                <label>Duration<input value={medicine.duration} maxLength="120" onChange={(event) => updateMedicine(index, 'duration', event.target.value)} placeholder="e.g. 3 days" required /></label>
                {medicine.medicineId && <label>Dispense quantity<input type="number" min="0" max={medicine.stock} step="1" value={medicine.dispensedQuantity} onChange={(event) => updateMedicine(index, 'dispensedQuantity', event.target.value)} placeholder="0 = prescription only" /></label>}
            </div>)}</div>}
        </section>

        <section className="consultation-section">
            <h3>Clinical notes <small>Visible to authorized clinical staff only</small></h3>
            <label className="consultation-full">Private notes<textarea name="clinicalNotes" maxLength="4000" rows="3" value={form.clinicalNotes} onChange={updateForm} placeholder="Not shown in the student portal" /></label>
        </section>

        <div className="consultation-actions">
            <button type="button" className="button-secondary" onClick={onCancel} disabled={saving}>Cancel</button>
            <button type="submit" className="button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save consultation'}</button>
        </div>
        <ToastContainer />
    </form>;
};

export default ConsultationForm;
