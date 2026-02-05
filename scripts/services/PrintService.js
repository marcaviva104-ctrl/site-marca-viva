/**
 * PrintService.js
 * Handles PDF generation for "Wall Sheets" (OS de Parede) and other printables.
 * Uses jsPDF (assumed loaded globally).
 */

const PrintService = {

    /**
     * Generates and opens a PDF for the Factory Wall Sheet (Ordem de Serviço).
     * Focus: Deadlines, Items, Client, Notes. NO PRICES.
     * @param {Object} protocol - The order protocol object.
     */
    printWallSheet: (protocol) => {
        if (!window.jspdf) {
            console.error("jsPDF not loaded");
            alert("Erro: Biblioteca de impressão não carregada.");
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // --- Header ---

        // Brand / Title
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("ORDEM DE PRODUÇÃO", 105, 20, { align: "center" });

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Protocolo: #${protocol.id}`, 105, 28, { align: "center" });

        // --- Big Date (The most important info) ---
        if (protocol.due_date) {
            const dateStr = new Date(protocol.due_date).toLocaleDateString('pt-BR');

            doc.setFillColor(240, 240, 240); // Light Gray Box
            doc.rect(20, 35, 170, 25, 'F');

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text("PRAZO DE ENTREGA", 105, 42, { align: "center" });

            doc.setFontSize(20);
            doc.setTextColor(0);
            doc.setFont("helvetica", "bold");
            doc.text(dateStr, 105, 52, { align: "center" });
        } else {
            // No date set
            doc.setFillColor(254, 243, 199); // Light Yellow Box
            doc.rect(20, 35, 170, 25, 'F');
            doc.setTextColor(180, 83, 9); // Brown text
            doc.setFontSize(14);
            doc.text("SEM PRAZO DEFINIDO", 105, 50, { align: "center" });
            doc.setTextColor(0);
        }

        // --- Client Info ---
        const clientName = protocol.client_name || (protocol.client?.raw_user_meta_data?.name) || 'Cliente';
        const clientEmail = (protocol.client?.email) || '';

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Cliente:", 20, 75);
        doc.setFont("helvetica", "normal");
        doc.text(`${clientName} (${clientEmail})`, 40, 75);

        // --- Priority ---
        if (protocol.priority && protocol.priority !== 'normal') {
            doc.setFont("helvetica", "bold");
            doc.setTextColor(220, 38, 38); // Red
            doc.text(`PRIORIDADE: ${protocol.priority.toUpperCase()}`, 140, 75);
            doc.setTextColor(0);
        }

        // --- Items Table (using autoTable if available, manual otherwise) ---
        // simplified manual approach for robustness if autoTable fails or complex configuration needed

        let yPos = 90;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Itens do Pedido", 20, yPos);
        yPos += 10;

        doc.setLineWidth(0.5);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;

        const items = protocol.items || [];

        if (items.length > 0) {
            items.forEach(item => {
                doc.setFontSize(16); // Big readability for factory
                doc.setFont("helvetica", "bold");
                doc.text(`${item.quantity}x`, 20, yPos);

                doc.setFont("helvetica", "normal");
                // Simple wrapping logic for long names
                const productName = item.product_name || "Produto";
                const splitTitle = doc.splitTextToSize(productName, 140);
                doc.text(splitTitle, 40, yPos);

                // Adjust Y based on lines
                yPos += (splitTitle.length * 8) + 10;
            });
        } else {
            doc.setFontSize(12);
            doc.setFont("helvetica", "italic");
            doc.text("Nenhum item listado ??", 20, yPos);
            yPos += 10;
        }

        // --- Notes / Observations ---
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Observações / Detalhes:", 20, yPos);
        yPos += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const notes = protocol.production_notes || protocol.notes || "Sem observações adicionais.";
        const splitNotes = doc.splitTextToSize(notes, 170);
        doc.text(splitNotes, 20, yPos);


        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Gerado por Marca Viva Admin System", 105, pageHeight - 10, { align: "center" });

        // Save / Open
        // doc.save(`OS_${protocol.id}.pdf`); // Downloads directly
        // Better UX: Open in new tab for print preview
        window.open(doc.output('bloburl'), '_blank');
    }
};

window.PrintService = PrintService;
