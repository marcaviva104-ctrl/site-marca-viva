
printProtocol: (id) => {
    const p = ProtocolsManager.state.protocols.find(i => i.id === id);
    if (!p) return;

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.text("Ordem de Produção / Pedido", 105, 20, null, null, "center");

        doc.setFontSize(10);
        doc.text(`Protocolo: #${p.id.slice(0, 8)}`, 14, 30);
        doc.text(`Data: ${new Date(p.created_at).toLocaleDateString('pt-BR')}`, 14, 35);

        // Client Info
        doc.setFontSize(12);
        doc.text("Dados do Cliente", 14, 45);
        doc.line(14, 46, 196, 46);

        doc.setFontSize(10);
        doc.text(`Nome: ${p.client_name}`, 14, 52);
        doc.text(`Email: ${p.client_email}`, 14, 57);

        // Items
        doc.setFontSize(12);
        doc.text("Itens do Pedido", 14, 70);
        doc.line(14, 71, 196, 71);

        let y = 80;
        const items = p.items || [];

        items.forEach((item, index) => {
            const qty = item.qty || item.quantity || 1;
            const totalLine = (parseFloat(item.price) * qty).toFixed(2);

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${item.name}`, 14, y);
            doc.setFont(undefined, 'normal');
            doc.text(`Qtd: ${qty}`, 150, y, null, null, "right");
            doc.text(`R$ ${totalLine}`, 190, y, null, null, "right");
            y += 5;

            // Details
            if (item.configuration) {
                const c = item.configuration;
                if (c.printMode) { doc.text(`   - Modo: ${c.printMode === 'color' ? 'Colorido' : 'P&B'}`, 14, y); y += 4; }
                if (c.stdPages) { doc.text(`   - Pág. Normal: ${c.stdPages} | Chapada: ${c.heavyPages}`, 14, y); y += 4; }
            }
            if (item.fileName) {
                doc.setTextColor(0, 0, 255);
                doc.text(`   - Arquivo: ${item.fileName}`, 14, y);
                doc.setTextColor(0, 0, 0);
                y += 4;
            }

            y += 4; // Spacing
        });

        // Total
        y += 5;
        doc.line(14, y, 196, y);
        y += 10;
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Total Geral: R$ ${p.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 190, y, null, null, "right");

        // Footer
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text("Gerado por Marca Viva System", 105, 280, null, null, "center");

        // Open PDF
        doc.save(`pedido_${p.id.slice(0, 8)}.pdf`);

    } catch (e) {
        console.error("PDF generation error:", e);
        Swal.fire('Erro', 'Não foi possível gerar o PDF. Verifique se o módulo jsPDF está carregado.', 'error');
    }
},
