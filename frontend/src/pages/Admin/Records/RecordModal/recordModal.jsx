import React from 'react';
import ConsultationDetails from '../../../../components/ConsultationDetails/consultationDetails';

const RecordModal = ({ selectedHistory }) => <div className="record-modal">
    <div className="student-modal-report">
        <div>{selectedHistory?.studentId?.name}</div>
        <div>{selectedHistory?.studentId?.recordType === 'employee' ? 'Employee ID' : 'Roll No.'} {selectedHistory?.studentId?.recordType === 'employee' ? selectedHistory?.studentId?.employeeId || selectedHistory?.studentId?.roll : selectedHistory?.studentId?.roll}</div>
    </div>
    <ConsultationDetails consultation={selectedHistory} includePrivate />
</div>;

export default RecordModal;
