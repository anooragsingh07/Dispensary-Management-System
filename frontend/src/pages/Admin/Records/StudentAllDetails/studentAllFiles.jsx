import React from 'react';
import '../RecordModal/recordModal.css';

const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'Date unavailable';

const StudentAllFiles = ({ studnetAllDetails = [] }) => {
    const student = studnetAllDetails[0]?.student;
    return (
        <div className="record-modal">
            {student && <div className="student-modal-report">
                <div>{student.name}</div>
                <div>Roll No. {studnetAllDetails[0]?.roll}</div>
            </div>}
            <div className="student-details-scroll">
                {studnetAllDetails.map((item) => (
                    <div className="student-modal-detail" key={item._id}>
                        <div className="student-modal-header">{formatDate(item.createdAt)}</div>
                        <div className="student-modal-body-student">
                            <div className="student-modal-body-header">
                                <div>Medicine</div>
                                <div>Quantity</div>
                            </div>
                            <div className="student-modal-body-item">
                                {(item.medicines || []).map((medicine, index) => (
                                    <div className="student-item-modal" key={`${item._id}-${index}`}>
                                        <div>{medicine.name}</div>
                                        <div>{medicine.requiredQuantity}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {!studnetAllDetails.length && <div>No visit records found.</div>}
            </div>
        </div>
    );
};

export default StudentAllFiles;
