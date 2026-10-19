import React from 'react';
import './consultationDetails.css';

const dateTime = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const text = (value) => value?.trim() || 'Not recorded';

const ConsultationDetails = ({ consultation, includePrivate = false }) => {
    const vitals = consultation?.vitals || {};
    const measurements = [
        vitals.temperatureC !== undefined && vitals.temperatureC !== null && `Temperature: ${vitals.temperatureC} °C`,
        vitals.bloodPressure && `Blood pressure: ${vitals.bloodPressure}`,
        vitals.pulseBpm !== undefined && vitals.pulseBpm !== null && `Pulse: ${vitals.pulseBpm} bpm`,
        vitals.other,
    ].filter(Boolean);
    return <div className="consultation-detail">
        <div className="consultation-detail-meta"><strong>{dateTime(consultation?.visitAt || consultation?.createdAt)}</strong>{consultation?.doctorId?.name && <span>Recorded by {consultation.doctorId.name}</span>}</div>
        <section><h3>Chief complaint</h3><p>{text(consultation?.chiefComplaint)}</p></section>
        <section><h3>Symptoms</h3><p>{text(consultation?.symptoms)}</p></section>
        <section><h3>Measured vitals</h3>{measurements.length ? <ul>{measurements.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Not recorded</p>}</section>
        <section><h3>Clinical assessment / diagnosis</h3><p>{text(consultation?.diagnosis)}</p></section>
        <section><h3>Prescription</h3>{consultation?.prescriptions?.length ? <div className="consultation-detail-prescriptions">{consultation.prescriptions.map((item, index) => <article key={item._id || index}>
            <strong>{item.medicineName || item.name}</strong>
            <span>{[item.dosage, item.frequency, item.duration].filter(Boolean).join(' · ') || 'Instructions not recorded'}</span>
            {Number(item.dispensedQuantity ?? item.requiredQuantity) > 0 && <small>Dispensed: {item.dispensedQuantity ?? item.requiredQuantity}</small>}
        </article>)}</div> : <p>No medicine prescribed</p>}</section>
        <section><h3>Doctor's advice</h3><p>{text(consultation?.doctorAdvice)}</p></section>
        <section><h3>Precautions</h3><p>{text(consultation?.precautions)}</p></section>
        <section><h3>Follow-up</h3><p>{consultation?.followUpAt ? dateTime(consultation.followUpAt) : 'No follow-up scheduled'}</p></section>
        {includePrivate && <section className="consultation-private-note"><h3>Clinical notes · staff only</h3><p>{text(consultation?.clinicalNotes)}</p></section>}
    </div>;
};

export default ConsultationDetails;
