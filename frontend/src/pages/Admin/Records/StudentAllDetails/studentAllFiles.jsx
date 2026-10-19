import React from 'react';
import ConsultationDetails from '../../../../components/ConsultationDetails/consultationDetails';

const StudentAllFiles = ({ studnetAllDetails = [] }) => {
    const first = studnetAllDetails[0];
    const student = first?.studentId;
    return <div className="record-modal">
        {student && <div className="student-modal-report"><div>{student.name}</div><div>Roll No. {student.roll}</div></div>}
        <div className="student-details-scroll">
            {studnetAllDetails.map((consultation) => <div className="student-modal-detail" key={consultation._id}><ConsultationDetails consultation={consultation} includePrivate /></div>)}
            {!studnetAllDetails.length && <div className="empty-state">No consultation records found.</div>}
        </div>
    </div>;
};

export default StudentAllFiles;
