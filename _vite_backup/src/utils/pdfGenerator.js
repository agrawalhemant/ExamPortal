import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generatePDF = (questions, userResponses, score, totalMarks) => {
    try {
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text("Exam Result Report", 14, 22);

        // Score Summary
        doc.setFontSize(12);
        doc.text(`Total Score: ${score} / ${totalMarks}`, 14, 32);
        doc.text(`Date: ${new Date().toLocaleString()}`, 14, 38);

        // Table Data Preparation
        const tableData = questions.map((q, index) => {
            const response = userResponses[q.id];
            const userAnswer = response?.selectedOption || "Not Answered";
            const status = response?.status || "Not Visited";

            let marksAwarded = 0;
            if (userAnswer === q.correctAnswer) {
                marksAwarded = q.marks;
            } else if (userAnswer !== "Not Answered") {
                marksAwarded = -q.negativeMarks;
            }

            return [
                index + 1,
                q.question,
                userAnswer,
                q.correctAnswer,
                marksAwarded
            ];
        });

        // Generate Table
        autoTable(doc, {
            startY: 45,
            head: [['#', 'Question', 'Your Answer', 'Correct Answer', 'Marks']],
            body: tableData,
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 80 }, // Question column wider
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 20 }
            },
            styles: { overflow: 'linebreak' },
            headStyles: { fillColor: [22, 160, 133] },
        });

        // Save PDF
        doc.save("exam_report.pdf");
    } catch (error) {
        console.error("Error generating PDF:", error);
    }
};
