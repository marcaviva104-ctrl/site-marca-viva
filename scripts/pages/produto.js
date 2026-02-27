/**
 * Produto Page Logic
 * Carrega dados do produto via URL params
 * [UPDATED] Suporte a Preços Escalonados (B2B)
 */

// Configure PDF.js Worker
document.addEventListener('DOMContentLoaded', () => {
    if (window.pdfjsLib) {
        try {
            const workerBlob = new Blob(
                [`importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js');`],
                { type: 'text/javascript' }
            );
            window.pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(workerBlob));
        } catch (e) {
            console.warn("Failed to create Blob worker, using main thread fallback");
        }
    }
});

let currentProduct = null;

// Pega ID da URL
function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Carrega Produto
async function loadProduct() {
    const productId = getProductIdFromURL();

    if (!productId) {
        Swal.fire('Erro', 'Produto não encontrado.', 'error').then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    try {
        // Buscar produto
        if (typeof productService !== 'undefined' && productService.getAll) {
            const products = productService.getAll();
            currentProduct = products.find(p => p.id === productId);
        }

        if (!currentProduct) {
            // Fallback cache
            const cached = JSON.parse(localStorage.getItem('mv_products') || '[]');
            currentProduct = cached.find(p => p.id === productId);
        }

        if (!currentProduct) {
            // Tenta buscar do Supabase se disponível (para pegar price_tiers atualizado)
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single();

                if (data) currentProduct = data;
            }
        }

        if (!currentProduct) {
            console.error('Produto não encontrado no banco ou cache.');
            throw new Error('Produto não encontrado');
        }
        console.log('Produto Carregado:', currentProduct);

        // Normalizar price_tiers se for string (JSON do banco)
        if (typeof currentProduct.price_tiers === 'string') {
            try {
                currentProduct.price_tiers = JSON.parse(currentProduct.price_tiers);
            } catch (e) {
                currentProduct.price_tiers = [];
            }
        }

        renderProduct();
        loadRelatedProducts();
        loadCrossSellProducts(); // ✨ CALLING NEW CROSS SELL FUNCTION
        updateCartBadge();
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível carregar o produto.', 'error').then(() => {
            window.location.href = 'index.html';
        });
    }
}

// Renderiza Produto
function renderProduct() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    // Título
    document.getElementById('page-title').innerText = `${currentProduct.name} | Marca Viva`;
    document.getElementById('product-title').innerText = currentProduct.name;
    document.getElementById('product-sku').innerText = `COD-${currentProduct.id.substring(0, 8).toUpperCase()}`;

    // Breadcrumb
    document.getElementById('breadcrumb-category').innerText = currentProduct.category || 'Produtos';
    document.getElementById('breadcrumb-product').innerText = currentProduct.name;

    // Imagem Principal
    const mainImage = document.getElementById('main-image');
    const imageUrl = currentProduct.image || 'https://via.placeholder.com/500?text=Sem+Imagem';
    mainImage.style.backgroundImage = `url('${imageUrl}')`;
    mainImage.style.cursor = 'zoom-in';
    mainImage.onclick = () => openLightbox(0);

    // Miniaturas (mock - múltiplas imagens)
    const thumbsContainer = document.getElementById('gallery-thumbs');
    window.productImages = [currentProduct.image, currentProduct.image, currentProduct.image, currentProduct.image];
    thumbsContainer.innerHTML = window.productImages.map((img, i) => `
        <div class="thumb-item ${i === 0 ? 'active' : ''}" 
             style="background-image: url('${img}')" 
             onclick="switchImage('${img}', this, ${i})"></div>
    `).join('');

    // Preço
    if (isLoggedIn) {
        if (currentProduct.pricing_type === 'variable') {
            renderVariablePricingSection();
        } else {
            renderPriceSection();
        }
    } else {
        document.getElementById('product-price').innerText = 'Sob Consulta';
        document.getElementById('price-unit-label').style.display = 'none';

        // Bloquear botão se não logado
        const btn = document.getElementById('add-to-cart-btn');
        btn.innerHTML = '<i class="ph-bold ph-lock"></i> Faça Login para Comprar';
        btn.onclick = () => {
            Swal.fire({
                icon: 'info',
                title: 'Login Necessário',
                text: 'Faça login para ver preços e adicionar ao carrinho.',
                confirmButtonText: 'Ir para Login',
                confirmButtonColor: '#f97316'
            }).then((result) => {
                if (result.isConfirmed) window.location.href = 'login.html';
            });
        };
    }

    // Descrição
    document.getElementById('product-description').innerText = currentProduct.description || 'Produto de alta qualidade para brindes corporativos.';

    // Personalização (opcional)
    const customSection = document.getElementById('customization-section');
    if (currentProduct.customizable || currentProduct.allowCustomization) {
        customSection.style.display = 'block';
    } else {
        customSection.style.display = 'none';
    }

    // Especificações (opcional)
    const specsSection = document.getElementById('specifications-section');
    const specsTbody = document.getElementById('specs-tbody');
    if (currentProduct.specifications && Object.keys(currentProduct.specifications).length > 0) {
        specsSection.style.display = 'block';
        specsTbody.innerHTML = Object.entries(currentProduct.specifications).map(([key, value]) => `
            <tr>
                <td>${key}</td>
                <td>${value}</td>
            </tr>
        `).join('');
    } else {
        specsSection.style.display = 'none';
    }

    // Calc Total IF NOT variable (variable handles its own calc)
    if (currentProduct.pricing_type !== 'variable') {
        // Enterprise Configurator
        if (window.renderConfigurator) window.renderConfigurator();
        updateTotal();
    }
}

// Renderiza a seção de preço (Preço base + Tabela Atacado)
function renderPriceSection() {
    const priceEl = document.getElementById('product-price');
    const labelEl = document.getElementById('price-unit-label');

    // Preço Base
    priceEl.innerText = `R$ ${currentProduct.price.toFixed(2).replace('.', ',')}`;
    labelEl.style.display = 'block';

    // Verificar se tem tiers
    const tiers = currentProduct.price_tiers;
    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
        // Criar ou limpar container de tabela de preços
        let tierContainer = document.getElementById('tier-pricing-container');
        if (!tierContainer) {
            tierContainer = document.createElement('div');
            tierContainer.id = 'tier-pricing-container';
            tierContainer.style.marginTop = '15px';
            tierContainer.style.background = '#f8fafc';
            tierContainer.style.padding = '10px';
            tierContainer.style.borderRadius = '8px';
            tierContainer.style.fontSize = '0.9rem';

            // Inserir logo após o preço
            priceEl.parentElement.appendChild(tierContainer);
        }

        tierContainer.innerHTML = `
            <strong style="color:#f97316; display:block; margin-bottom:5px;">
                <i class="ph-bold ph-tag"></i> Descontos por Quantidade:
            </strong>
            <table style="width:100%; text-align:left; border-collapse: collapse;">
                <thead style="border-bottom: 1px solid #e2e8f0;">
                    <tr>
                        <th style="padding:4px;">Qtd. Mínima</th>
                        <th style="padding:4px;">Preço Unit.</th>
                    </tr>
                </thead>
                <tbody>
                    ${tiers.map(tier => `
                        <tr>
                            <td style="padding:4px; color:#475569;">+${tier.min} peças</td>
                            <td style="padding:4px; font-weight:bold; color:#1e293b;">R$ ${tier.price.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// ===== VARIABLE PRICING LOGIC (Apostilas) =====
let variablePricingState = {
    mode: 'automatic', // or 'manual'
    printMode: 'bw', // 'bw' or 'color'
    stdPages: 0,
    heavyPages: 0,
    totalPages: 0,
    file: null,
    isAnalyzed: false
};

function renderVariablePricingSection() {
    const priceEl = document.getElementById('product-price');
    const labelEl = document.getElementById('price-unit-label');
    const buyBtn = document.getElementById('add-to-cart-btn');

    // 1. Hide Standard Controls that interfere - Keep them but rename label
    const qtyLabel = document.querySelector('.quantity-section label');
    if (qtyLabel) qtyLabel.innerText = "Nº de Apostilas (Cópias)";

    // 2. Base Price Display
    const basePrice = currentProduct.base_price || 0;

    // Determine Prices based on Mode
    const isColor = variablePricingState.printMode === 'color';
    const stdPrice = isColor ? (currentProduct.variable_price_color || 0.50) : (currentProduct.variable_price || 0.10);
    const heavyPrice = isColor ? (currentProduct.variable_price_heavy_color || 1.00) : (currentProduct.variable_price_heavy || 0.25);

    // Update Main Price Display
    if (variablePricingState.totalPages > 0) {
        // Price already calculated
        priceEl.innerHTML = `
            <div style="font-size: 0.9rem; color: #475569; margin-bottom: 5px; line-height: 1.4;">
                <i class="ph-fill ph-check-circle" style="color:#10b981"></i> 
                Preço calculado para <strong>${variablePricingState.totalPages} páginas</strong>.
            </div>
            <div id="dynamic-unit-price" style="font-size: 1.5rem; font-weight: 800; color: var(--primary-hero);">
                R$ ${(basePrice + (variablePricingState.stdPages * stdPrice) + (variablePricingState.heavyPages * heavyPrice)).toFixed(2).replace('.', ',')}
            </div>
        `;
    } else {
        // Initial State
        priceEl.innerHTML = `
            <div style="font-size: 0.9rem; color: #475569; margin-bottom: 5px; line-height: 1.4;">
                <i class="ph-fill ph-info" style="color:var(--accent-orange)"></i> 
                (Capa + 1 pág):
            </div>
            <div id="dynamic-unit-price" style="font-size: 1.5rem; font-weight: 800; color: var(--primary-hero);">
                R$ ${(basePrice + stdPrice).toFixed(2).replace('.', ',')}
            </div>
        `;
    }
    labelEl.style.display = 'none';

    // 3. Inject Variable UI Container
    let varContainer = document.getElementById('variable-pricing-ui');
    if (!varContainer) {
        varContainer = document.createElement('div');
        varContainer.id = 'variable-pricing-ui';
        varContainer.className = 'card';
        varContainer.style.marginTop = '20px';
        varContainer.style.borderColor = 'var(--accent-orange)';
        varContainer.style.background = '#fff7ed'; // Light orange bg

        // Insert after price section
        const priceSection = document.querySelector('.price-section');
        if (priceSection) priceSection.after(varContainer);
    }

    // Prepare HTML for the container
    varContainer.innerHTML = `
        <h4 style="color: var(--primary-hero); margin-bottom: 10px; display:flex; align-items:center; gap:8px;">
            <i class="ph-bold ph-files"></i> Configuração da Apostila
        </h4>

        <!-- Print Mode Selector -->
        <div style="background: white; padding: 10px; border-radius: 8px; margin-bottom: 15px; border: 1px solid #fed7aa;">
            <label style="font-size: 0.85rem; font-weight: 600; color: #431407; display: block; margin-bottom: 8px;">Tipo de Impressão:</label>
            <div style="display: flex; gap: 10px;">
                <button onclick="switchPrintMode('bw')" id="btn-print-bw" 
                    style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid ${!isColor ? 'var(--accent-orange)' : '#e2e8f0'}; background: ${!isColor ? '#fff7ed' : 'white'}; color: ${!isColor ? '#ea580c' : '#64748b'}; font-weight: 600; cursor: pointer;">
                    <i class="ph-bold ph-printer"></i> Preto e Branco
                </button>
                <button onclick="switchPrintMode('color')" id="btn-print-color" 
                    style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid ${isColor ? 'var(--accent-orange)' : '#e2e8f0'}; background: ${isColor ? '#fff7ed' : 'white'}; color: ${isColor ? '#ea580c' : '#64748b'}; font-weight: 600; cursor: pointer;">
                    <i class="ph-bold ph-palette"></i> Colorido
                </button>
            </div>
             <div style="font-size: 0.75rem; color: #9a3412; margin-top: 5px; text-align: center;">
                ${isColor ? 'Impressão Colorida (Jato de Tinta Premium)' : 'Impressão P&B (Laser Econômica)'}
            </div>
        </div>
        
        </div>
        
        <!-- Pricing Rules Info -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 15px; font-size: 0.8rem; color: #475569;">
            <strong style="display:block; margin-bottom:5px; color:#334155;"><i class="ph-bold ph-info"></i> Entenda o Valor:</strong>
            <ul style="margin: 0; padding-left: 20px; list-style-type: disc;">
                <li style="margin-bottom: 4px;">
                    <strong>Impressão P&B:</strong> 
                    <span style="color:#ea580c;">R$ 0,25</span>/pág (Varejo) ou 
                    <span style="color:#16a34a;">R$ 0,10</span>/pág (acima de 50 apostilas).
                    <em>Não depende de cobertura de tinta.</em>
                </li>
                <li>
                    <strong>Encadernação:</strong> Inicia em <span style="color:#ea580c;">R$ 3,00</span> (até 50 folhas) e adiciona R$ 0,50 a cada 50 folhas.
                </li>
            </ul>
        </div>

        <!-- Toggle Tabs -->
        <div style="display:flex; border-bottom:1px solid #fed7aa; margin-bottom:15px;">
            <button onclick="switchVariableMode('automatic')" 
                style="flex:1; padding:10px; background:${variablePricingState.mode === 'automatic' ? '#fff' : 'transparent'}; border:none; border-bottom:${variablePricingState.mode === 'automatic' ? '2px solid var(--accent-orange)' : 'none'}; font-weight:600; color:${variablePricingState.mode === 'automatic' ? 'var(--accent-orange)' : '#64748b'}; cursor:pointer;">
                <i class="ph-bold ph-file-pdf"></i> Enviar PDF
            </button>
            <button onclick="switchVariableMode('manual')" 
                style="flex:1; padding:10px; background:${variablePricingState.mode === 'manual' ? '#fff' : 'transparent'}; border:none; border-bottom:${variablePricingState.mode === 'manual' ? '2px solid var(--accent-orange)' : 'none'}; font-weight:600; color:${variablePricingState.mode === 'manual' ? 'var(--accent-orange)' : '#64748b'}; cursor:pointer;">
                <i class="ph-bold ph-pencil-simple"></i> Simular
            </button>
        </div>
        
        <!-- Auto Mode UI -->
        <div id="var-ui-auto" style="display: ${variablePricingState.mode === 'automatic' ? 'block' : 'none'};">
            <div style="border: 2px dashed #fed7aa; border-radius: 8px; padding: 20px; text-align: center; background: white; cursor: pointer;"
                 onclick="document.getElementById('pdf-upload').click()">
                <i class="ph-duotone ph-file-pdf" style="font-size: 2.5rem; color: var(--accent-orange);"></i>
                <p style="margin: 10px 0; font-weight: 600; color: #431407;">Clique para enviar seu PDF</p>
                <p style="font-size: 0.8rem; color: #9a3412;">Análise automática de páginas.</p>
                <input type="file" id="pdf-upload" accept="application/pdf" style="display: none;" onchange="handlePdfUpload(this)">
            </div>
            <div id="analysis-status" style="display:none; margin-top:10px;">
                <div style="height:6px; background:#fed7aa; border-radius:3px; overflow:hidden;">
                    <div id="analysis-progress" style="height:100%; width:0%; background:var(--accent-orange); transition: width 0.3s;"></div>
                </div>
                <p id="analysis-text" style="font-size:0.8rem; color:#431407; text-align:center; margin-top:5px;">Analisando...</p>
            </div>
        </div>

        <!-- Manual Mode UI -->
        <div id="var-ui-manual" style="display: ${variablePricingState.mode === 'manual' ? 'block' : 'none'};">
             <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #fed7aa;">
                <div style="margin-bottom:10px;">
                    <label style="font-size: 0.85rem; font-weight: 600;">Total de Páginas:</label>
                    <input type="number" id="manual-pages-input" value="${variablePricingState.totalPages || 0}" min="0" 
                        oninput="handleManualPageChange(this.value)"
                        style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:5px;">
                </div>
             </div>
        </div>
    `;

    // Results Summary
    if (variablePricingState.totalPages > 0) {
        const qtyInput = document.getElementById('qty-input');
        const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;

        varContainer.innerHTML += `
            <div id="var-results" style="margin-top:15px; padding-top:15px; border-top:1px solid #fed7aa;">
                <div id="row-std" style="display:${isColor ? 'flex' : 'none'}; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                    <span>Páginas Padrão:</span>
                    <strong id="res-std">${variablePricingState.stdPages}</strong>
                </div>
                <div id="row-heavy" style="display:${isColor ? 'flex' : 'none'}; justify-content:space-between; font-size:0.9rem; margin-bottom:5px;">
                    <span>Páginas Chapadas (>= 50%):</span>
                    <strong id="res-heavy">${variablePricingState.heavyPages}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin-bottom:5px; color: #431407;">
                    <span>Total Páginas:</span>
                    <strong id="res-total">${variablePricingState.totalPages}</strong>
                </div>
                <div id="price-desc-text" style="margin-top: 10px; font-size: 0.8rem; color: #ea580c; text-align: right; font-weight: 500;">
                    ${isColor
                ? `Preço por página: R$ ${stdPrice.toFixed(2)} (Padrão) / R$ ${heavyPrice.toFixed(2)} (Chapada)`
                : `Preço por página P&B: R$ ${qty >= 50 ? '0,10' : '0,25'} ${qty >= 50 ? '(Atacado)' : '(Varejo)'}`}
                </div>
            </div>
        `;

        // Enable Buy Button
        buyBtn.disabled = false;
        buyBtn.innerHTML = '<i class="ph-bold ph-shopping-cart"></i> Adicionar ao Carrinho';
        buyBtn.style.opacity = '1';
        buyBtn.style.cursor = 'pointer';
    } else {
        buyBtn.disabled = true;
        buyBtn.innerHTML = '<i class="ph-bold ph-files"></i> Configure sua Apostila';
        buyBtn.style.opacity = '0.6';
        buyBtn.style.cursor = 'not-allowed';
    }
}

window.switchPrintMode = function (mode) {
    variablePricingState.printMode = mode;
    calculateVariableTotal(); // Recalc total logic
    renderVariablePricingSection(); // Re-render to update UI and prices
}

window.switchVariableMode = function (mode) {
    variablePricingState.mode = mode;
    renderVariablePricingSection();
}

// Helper to update result texts without destroying DOM
function updateResultValues() {
    const stdEl = document.getElementById('res-std');
    const heavyEl = document.getElementById('res-heavy');
    const totalEl = document.getElementById('res-total');
    const resultsContainer = document.getElementById('var-results');

    // Safety check
    if (!totalEl) return;

    // Update Counts
    if (stdEl) stdEl.innerText = variablePricingState.stdPages;
    if (heavyEl) heavyEl.innerText = variablePricingState.heavyPages;
    totalEl.innerText = variablePricingState.totalPages;

    // Toggle Visibility of Breakdown based on Color Mode
    const isColor = variablePricingState.printMode === 'color';

    // Rows
    const rowStd = document.getElementById('row-std');
    const rowHeavy = document.getElementById('row-heavy');

    if (rowStd) rowStd.style.display = isColor ? 'flex' : 'none';
    if (rowHeavy) rowHeavy.style.display = isColor ? 'flex' : 'none';

    // Show/Hide Results Container
    if (variablePricingState.totalPages > 0) {
        if (resultsContainer) resultsContainer.style.display = 'block';
    } else {
        if (resultsContainer) resultsContainer.style.display = 'none';
    }

    // Update Price Text Description
    const priceDescEl = document.getElementById('price-desc-text');
    if (priceDescEl) {
        if (isColor) {
            priceDescEl.innerHTML = `Preço por página: R$ 0,50 (Padrão) / R$ 1,00 (Chapada)`;
        } else {
            // B&W Logic Text
            const qtyInput = document.getElementById('qty-input');
            const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
            const price = qty >= 50 ? '0,10' : '0,25';
            const condition = qty >= 50 ? '(Atacado)' : '(Varejo)';
            priceDescEl.innerHTML = `Preço por página P&B: R$ ${price} ${condition}`;
        }
    }
}

window.handleManualPageChange = function (val) {
    // Prevent negative numbers
    if (val < 0) val = 0;

    const pages = parseInt(val) || 0;
    variablePricingState.totalPages = pages;
    variablePricingState.file = null;
    variablePricingState.isAnalyzed = true;

    // Estimate for Color: 80% std, 20% heavy. For B&W it doesn't matter math-wise but we keep tracking.
    variablePricingState.stdPages = Math.ceil(pages * 0.8);
    variablePricingState.heavyPages = Math.floor(pages * 0.2);

    // Recalculate Total (Money)
    calculateVariableTotal();

    // Update UI Values (Text) - DO NOT RE-RENDER DOM
    updateResultValues();
}

window.handlePdfUpload = async function (input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];

    // Validar Tamanho Máximo (700MB) - Impede erros lentos no Supabase
    const MAX_SIZE_MB = 700;
    const maxSizeInBytes = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
        Swal.fire({
            icon: 'error',
            title: 'Arquivo Muito Grande',
            text: `O PDF selecionado tem ${(file.size / 1024 / 1024).toFixed(1)}MB. O tamanho máximo permitido é ${MAX_SIZE_MB}MB. Por favor, comprima seu arquivo antes de enviar.`
        });
        input.value = ''; // Limpa o input
        return;
    }

    variablePricingState.file = file;

    const statusDiv = document.getElementById('analysis-status');
    const progressBar = document.getElementById('analysis-progress');
    const statusText = document.getElementById('analysis-text');

    statusDiv.style.display = 'block';
    progressBar.style.width = '0%';
    statusText.innerText = 'Carregando PDF...';

    try {
        const fileReader = new FileReader();
        fileReader.onload = async function () {
            try {
                const typedarray = new Uint8Array(this.result);
                const loadingTask = pdfjsLib.getDocument({
                    data: typedarray,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                    cMapPacked: true,
                });
                const pdf = await loadingTask.promise;

                let stdCount = 0;
                let heavyCount = 0;
                const totalPages = pdf.numPages;

                // Analyze pages
                for (let i = 1; i <= totalPages; i++) {
                    statusText.innerText = `Analisando página ${i} de ${totalPages}...`;
                    progressBar.style.width = `${(i / totalPages) * 100}% `;

                    const isHeavy = await analyzePageCoverage(pdf, i);
                    if (isHeavy) heavyCount++;
                    else stdCount++;
                }

                // Done
                variablePricingState.stdPages = stdCount;
                variablePricingState.heavyPages = heavyCount;
                variablePricingState.totalPages = totalPages;
                variablePricingState.isAnalyzed = true;

                // Update UI by re-rendering the whole section with the new state
                renderVariablePricingSection();
                calculateVariableTotal();

                // Show a success message
                Swal.fire({
                    icon: 'success',
                    title: 'PDF Analisado!',
                    text: `Encontramos ${totalPages} páginas prontas para impressão.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } catch (err) {
                console.error("PDF Inner Error:", err);
                Swal.fire('Erro na Análise do PDF', 'Motivo: ' + (err.message || err.toString()) + '\n\nVerifique se o PDF não está corrompido ou protegido por senha.', 'error');
                statusDiv.style.display = 'none';
            }
        };
        fileReader.readAsArrayBuffer(file);
    } catch (err) {
        console.error("PDF External Error:", err);
        Swal.fire('Erro no PDF', 'Não foi possível ler o arquivo. ' + err.message, 'error');
        statusDiv.style.display = 'none';
    }
}

async function analyzePageCoverage(pdf, pageNum) {
    // 1. Render page to small canvas
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.2 }); // Small scale for speed (approx 150-200px width)

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport: viewport }).promise;

    // 2. Count Pixels
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let darkPixels = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Simple brightness formula
        const brightness = (r + g + b) / 3;

        // Threshold: if brightness < 240, consider it "ink" (not pure white)
        // This is a loose heuristic. For "chapado", we want LOTS of ink.
        if (brightness < 240) {
            darkPixels++;
        }
    }

    const coverage = darkPixels / totalPixels;
    // Threshold for HEAVY: >= 65% coverage
    return coverage >= 0.65;
}

window.calculateVariableTotal = function () {
    const std = variablePricingState.stdPages;
    const heavy = variablePricingState.heavyPages;
    const totalPages = std + heavy;

    const basePrice = currentProduct.base_price || 0;

    // Get Quantity
    const qtyInput = document.getElementById('qty-input');
    const qty = parseInt(qtyInput ? qtyInput.value : 1) || 1;

    // --- 1. Printing Price ---
    const isColor = variablePricingState.printMode === 'color';
    let stdPrice, heavyPrice;

    if (isColor) {
        stdPrice = currentProduct.variable_price_color || 0.50;
        heavyPrice = currentProduct.variable_price_heavy_color || 1.00;
    } else {
        // B&W Volume Tier: >= 50 units (apostilas) gets R$ 0.10, else R$ 0.25
        const bwPrice = qty >= 50 ? 0.10 : 0.25;
        stdPrice = bwPrice;
        heavyPrice = bwPrice;
    }

    const printingPrice = (std * stdPrice) + (heavy * heavyPrice);

    // --- 2. Binding Price (Encadernação) ---
    // Logic: Spiral Binding (Based on Sheets = Pages/2)
    // Price Table (Discounted -0.50 from Original): 0-50 sheets: 3.00, +0.50 for every 50 sheets.
    let bindingPrice = 0;
    if (totalPages > 0) {
        const sheets = Math.ceil(totalPages / 2);
        bindingPrice = 3.00 + (Math.ceil(Math.max(0, sheets - 50) / 50) * 0.50);
    }

    // --- Total Unit Price ---
    // Removed basePrice (3.00) to match user expectation (Print + Binding only)
    const unitPrice = printingPrice + bindingPrice;

    // Update Display
    const dynamicPriceEl = document.getElementById('dynamic-unit-price');
    if (dynamicPriceEl) dynamicPriceEl.innerText = `R$ ${unitPrice.toFixed(2).replace('.', ',')} /unidade`;

    // Enable/Disable Buy Button
    const buyBtn = document.getElementById('add-to-cart-btn');
    if ((std + heavy) > 0) {
        buyBtn.disabled = false;
        buyBtn.innerText = 'Adicionar ao Carrinho';
        buyBtn.style.opacity = '1';
        buyBtn.style.cursor = 'pointer';

        // Update Total Price (Unit * Qty)
        const qty = parseInt(document.getElementById('qty-input').value) || 1;

        // We override the global updateTotal logic for this moment
        const total = unitPrice * qty;
        const totalEl = document.getElementById('total-price');
        if (totalEl) totalEl.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

    } else {
        buyBtn.disabled = true;
        buyBtn.innerText = 'Configure as Páginas';
        buyBtn.style.opacity = '0.6';
    }

    // Store calc for addToCart
    variablePricingState.currentUnitPrice = unitPrice;
}

// Trocar Imagem
let currentImageIndex = 0;

function switchImage(imageUrl, thumbElement, index) {
    document.getElementById('main-image').style.backgroundImage = `url('${imageUrl}')`;
    document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
    thumbElement.classList.add('active');
    currentImageIndex = index;
}

// Ajustar Quantidade
function adjustQty(change) {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value) || 1;

    // Determine Minimum Qty based on type
    let minQty = 100; // Default for B2B
    if (currentProduct && currentProduct.pricing_type === 'variable') {
        minQty = 1; // Apostilas allowed 1
    }

    val += change;
    if (val < minQty) val = minQty;

    input.value = val;
    updateTotal();
}

// Calcula preço baseado na quantidade (Lógica B2B)
function getPriceForQty(qty) {
    if (!currentProduct) return 0;

    let finalPrice = currentProduct.price;
    const tiers = currentProduct.price_tiers;

    if (tiers && Array.isArray(tiers)) {
        // Encontrar o tier applicável (o maior min que seja <= qty)
        // Ex: Tiers: [{min: 100, price: 10}, {min: 500, price: 8}]
        // Qty: 600 -> Pega tier 500 (R$ 8)

        // Ordenar descrescente por min para achar o primeiro match
        const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
        const match = sortedTiers.find(t => qty >= t.min);

        if (match) {
            finalPrice = match.price;
        }
    }

    return finalPrice;
}

// Atualizar Total
function updateTotal() {
    if (!currentProduct) return;

    // Handle variable pricing separately
    if (currentProduct.pricing_type === 'variable') {
        if (typeof calculateVariableTotal === 'function') {
            calculateVariableTotal();
            if (typeof updateResultValues === 'function') updateResultValues();
        }
        return;
    }

    const isLoggedIn = window.authService && window.authService.isAuthenticated();
    if (!isLoggedIn) return;

    const qty = parseInt(document.getElementById('qty-input').value) || 100;

    // Enterprise Configurator Modifier
    const modifier = (window.configuratorState && window.configuratorState.totalModifier) || 0;

    // Novo cálculo com tiers + modifiers
    const baseUnitPrice = getPriceForQty(qty);
    const unitPrice = baseUnitPrice + modifier;

    const total = qty * unitPrice;

    // Atualiza Visual do Preço Unitário (se mudou)
    const priceEl = document.getElementById('product-price');
    if (priceEl) {
        if (unitPrice < (currentProduct.price + modifier)) {
            // Mostra desconto (Base Original + Mod vs Base Discounted + Mod)
            priceEl.innerHTML = `<span style="text-decoration:line-through; font-size:1rem; color:#94a3b8; margin-right:5px;">R$ ${(currentProduct.price + modifier).toFixed(2).replace('.', ',')}</span> R$ ${unitPrice.toFixed(2).replace('.', ',')}`;
        } else {
            priceEl.innerHTML = `<span style="text-decoration:line-through; font-size:1rem; color:#94a3b8; display:none;"></span> R$ ${unitPrice.toFixed(2).replace('.', ',')}`;
        }
        priceEl.innerText = `R$ ${unitPrice.toFixed(2).replace('.', ',')}`;
    }

    const totalEl = document.getElementById('total-price');
    if (totalEl) totalEl.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// Add to Cart
async function addToCart() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    if (!isLoggedIn) {
        Swal.fire({
            icon: 'info',
            title: 'Login Necessário',
            text: 'Faça login para adicionar ao carrinho.',
            confirmButtonText: 'Ir para Login',
            confirmButtonColor: '#f97316'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'login.html';
        });
        return;
    }

    if (!window.cartService) {
        Swal.fire('Erro', 'Erro ao carregar carrinho. Recarregue a página.', 'error');
        return;
    }

    let qty = parseInt(document.getElementById('qty-input').value) || 100;

    // Adjust Qty Min handling (Variable usually allows 1 unit?)
    if (currentProduct.pricing_type === 'variable') {
        qty = parseInt(document.getElementById('qty-input').value) || 1;
    }

    let customization = document.getElementById('customization-select').value;
    let finalUnitPrice = 0;

    if (currentProduct.pricing_type === 'variable') {
        finalUnitPrice = variablePricingState.currentUnitPrice || 0;

        // Build readable customization string
        const std = variablePricingState.stdPages;
        const heavy = variablePricingState.heavyPages;
        const modeLabel = variablePricingState.printMode === 'color' ? 'Colorido' : 'P&B';
        customization = `Apostila Auto (${modeLabel}): ${std} Pág. Normal + ${heavy} Pág. Cheia`;

        if (finalUnitPrice <= 0) {
            Swal.fire('Configuração Inválida', 'Configure as páginas da apostila antes de adicionar.', 'warning');
            return;
        }

    } else {
        // Preço B2B (Standard)
        const modifier = (window.configuratorState && window.configuratorState.totalModifier) || 0;
        finalUnitPrice = getPriceForQty(qty) + modifier;

        // Enterprise Configurator Text
        if (window.configuratorState && window.configuratorState.selections) {
            const configParts = [];
            Object.entries(window.configuratorState.selections).forEach(([gIdx, oIdx]) => {
                const group = currentProduct.configuration_rules[gIdx];
                if (group && group.options[oIdx]) {
                    configParts.push(`${group.name}: ${group.options[oIdx].label}`);
                }
            });
            if (configParts.length > 0) {
                customization = (customization === "Sem gravação" || !customization) ? configParts.join(', ') : customization + ' | ' + configParts.join(', ');
            }
        }
    }

    // --- File Upload Logic (New) ---
    let fileUrl = null;
    let fileName = null;

    if (currentProduct.pricing_type === 'variable' && variablePricingState.file) {
        // Show Loading
        Swal.fire({
            title: 'Enviando arquivo...',
            html: 'Por favor, aguarde o upload do seu PDF.<br><br><small>Dependendo do tamanho, isso pode levar alguns segundos.</small>',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const file = variablePricingState.file;
            fileName = file.name;
            const TUS_THRESHOLD = 30 * 1024 * 1024; // 30MB

            if (file.size > TUS_THRESHOLD) {
                // Fechar e Resetar o SweetAlert de "Enviando arquivo"
                Swal.hideLoading();
                Swal.close();

                // Pedir o Link Externo
                const { value: externalLink } = await Swal.fire({
                    title: 'Arquivo Muito Pesado! 🗂️',
                    html: `
                        <p style="font-size: 0.95rem; color: #475569; margin-bottom: 15px;">
                            Identificamos que seu arquivo tem <b>${(file.size / 1024 / 1024).toFixed(1)}MB</b>.
                        </p>
                        <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 15px;">
                            Para não travar sua compra devido à lentidão da internet, por favor, coloque este arquivo no seu <b>Google Drive</b> ou <b>WeTransfer</b> e cole o link de compartilhamento abaixo:
                        </p>
                        
                        <div style="background: #fff7ed; border: 1px solid #fed7aa; padding: 10px; border-radius: 8px; font-size: 0.8rem; color: #9a3412; text-align: left; margin-bottom: 10px; display: flex; gap: 8px; align-items: flex-start;">
                            <i class="ph-fill ph-info" style="font-size: 1.2rem; color: var(--accent-orange); margin-top: 2px;"></i>
                            <div>
                                <strong>Como pegar o link no Google Drive?</strong><br>
                                1. Salve seu PDF no seu Google Drive.<br>
                                2. Clique com o botão direito no arquivo > "Compartilhar".<br>
                                3. Em Acesso Geral, mude para "Qualquer pessoa com o link".<br>
                                4. Clique em "Copiar Link" e cole no campo abaixo.
                            </div>
                        </div>
                    `,
                    input: 'url',
                    inputPlaceholder: 'Ex: https://drive.google.com/file/d/...',
                    showCancelButton: true,
                    confirmButtonText: 'Confirmar Link',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#f97316',
                    didOpen: () => {
                        // Força a remoção do loader caso o SweetAlert tenha bugado a transição
                        Swal.hideLoading();
                    },
                    inputValidator: (value) => {
                        if (!value) {
                            return 'Você precisa informar um link válido!';
                        }
                        if (!value.startsWith('http')) {
                            return 'O link precisa começar com http:// ou https://';
                        }
                    }
                });

                if (externalLink) {
                    // Validação extra para links do Google Drive
                    if (externalLink.includes('drive.google.com')) {
                        const { isConfirmed } = await Swal.fire({
                            title: 'Última Confirmação! ⚠️',
                            html: `
                                <p style="font-size: 0.95rem; color: #475569; margin-bottom: 15px;">
                                    Você inseriu um link do Google Drive.
                                </p>
                                <p style="font-size: 0.9rem; color: #9a3412; font-weight: 600; padding: 15px; background: #fff7ed; border-radius: 8px; border: 1px solid #fed7aa;">
                                    Você tem CERTEZA de que alterou o acesso do arquivo para "Qualquer pessoa com o link"?
                                </p>
                                <p style="font-size: 0.8rem; color: #64748b; margin-top: 15px;">
                                    Se o arquivo for enviado como "Restrito", nossa equipe não conseguirá visualizá-lo e o seu pedido sofrerá atrasos na produção.
                                </p>
                            `,
                            icon: 'warning',
                            showCancelButton: true,
                            confirmButtonColor: '#10b981',
                            cancelButtonColor: '#64748b',
                            confirmButtonText: 'Sim, o link é Público!',
                            cancelButtonText: 'Não, cancelar e revisar'
                        });

                        if (!isConfirmed) {
                            return; // User canceled to review the link
                        }
                    }

                    fileUrl = externalLink;
                    fileName = "Link Externo: " + file.name;
                    // Mock small upload time for UX
                    Swal.fire({
                        title: 'Salvando Link...',
                        allowOutsideClick: false,
                        showConfirmButton: false,
                        didOpen: () => { Swal.showLoading(); }
                    });
                    await new Promise(r => setTimeout(r, 800));
                } else {
                    // Usuário cancelou
                    return;
                }
            } else {
                // Arquivo menor que 30MB - Upload Normal
                isUploading = true;
                window.addEventListener('beforeunload', unloadWarning);

                // Use StorageManager to upload to the products bucket, in the client_uploads folder
                if (window.StorageManager) {
                    // If file is > 30MB, use the TUS Resumable Upload. Otherwise, use standard upload.
                    const TUS_THRESHOLD = 30 * 1024 * 1024;
                    if (file.size > TUS_THRESHOLD && window.StorageManager.uploadLargeFile) {

                        Swal.update({
                            html: `Preparando Modo Arquivo Pesado...<br><br><small>Vamos enviar seu PDF de ${(file.size / 1024 / 1024).toFixed(1)}MB em partes seguras.</small>`
                        });

                        fileUrl = await window.StorageManager.uploadLargeFile(
                            file,
                            'client_uploads',
                            'products',
                            (percentage) => {
                                // Update Swal dynamically
                                Swal.update({
                                    html: `Por favor, não feche esta página.<br><br><b>Enviando: ${percentage}%</b><br><small>Dividindo e enviando seu arquivo em partes seguras...</small>`
                                });
                            }
                        );
                    } else {
                        // Standard small file upload
                        fileUrl = await window.StorageManager.uploadFile(file, 'client_uploads', 'products');
                    }
                } else {
                    console.warn("StorageManager not found. File will not be persisted.");
                }

                if (!fileUrl) {
                    throw new Error("Falha no upload do arquivo.");
                }

                isUploading = false;
                window.removeEventListener('beforeunload', unloadWarning);
            }

            Swal.close(); // Close loading

        } catch (err) {
            isUploading = false;
            window.removeEventListener('beforeunload', unloadWarning);
            console.error("Upload Error:", err);
            Swal.fire('Erro no Upload', 'Detalhes: ' + (err.message || err.toString()), 'error');
            return;
        }
    }

    // Criar objeto produto com preço ajustado e arquivo
    const productToAdd = {
        ...currentProduct,
        price: finalUnitPrice,
        originalPrice: currentProduct.price,
        pricing_type: currentProduct.pricing_type,
        // Persist File Info
        fileUrl: fileUrl,
        fileName: fileName,
        configuration: {
            ...variablePricingState,
            ...((window.configuratorState && window.configuratorState.selections) ? window.configuratorState : {})
        }
    };

    window.cartService.addToCart(productToAdd, qty, customization);

    // Sucesso
    Swal.fire({
        icon: 'success',
        title: 'Adicionado ao Carrinho!',
        text: `${qty}x ${currentProduct.name} - Unit: R$ ${finalUnitPrice.toFixed(2)}`,
        showCancelButton: true,
        confirmButtonText: 'Ver Carrinho / Orçamento',
        cancelButtonText: 'Continuar Comprando',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b'
    }).then((result) => {
        // Limpar tela da apostila (UX)
        if (currentProduct.pricing_type === 'variable') {
            setTimeout(() => {
                const uploadInput = document.getElementById('pdf-upload');
                if (uploadInput) uploadInput.value = '';

                variablePricingState.file = null;
                variablePricingState.isAnalyzed = false;
                variablePricingState.stdPages = 0;
                variablePricingState.heavyPages = 0;
                variablePricingState.totalPages = 0;

                const statusDiv = document.getElementById('analysis-status');
                if (statusDiv) statusDiv.style.display = 'none';

                renderVariablePricingSection();
                calculateVariableTotal();
            }, 1000); // 1 segundo de delay
        }

        if (result.isConfirmed) {
            // Abre o sidebar do carrinho
            window.cartService.toggle();
        }
    });

    updateCartBadge();
}

// Produtos Relacionados
async function loadRelatedProducts() {
    const container = document.getElementById('related-grid');

    if (!container) {
        console.warn('Related grid container not found');
        return;
    }

    let allProducts = [];

    // Ensure Service is Ready
    if (typeof productService !== 'undefined') {
        allProducts = productService.getAll();

        // If empty, try to init (fetch from DB)
        if (allProducts.length === 0 && productService.init) {
            console.log("Fetching related products...");
            try {
                await productService.init();
                allProducts = productService.getAll();
            } catch (e) {
                console.warn("Retrying fetch for related products failed", e);
            }
        }
    }

    // Fallback to local storage if still empty
    if (allProducts.length === 0) {
        allProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
    }

    // Still empty?
    if (allProducts.length === 0) {
        container.innerHTML = '<p style="color:#94a3b8; padding:20px;">Nenhum produto relacionado encontrado.</p>';
        return;
    }

    // Pegar produtos da mesma categoria, excluindo o produto atual
    const category = currentProduct ? currentProduct.category : null;
    let related = [];

    if (category) {
        related = allProducts
            .filter(p => p.id !== currentProduct.id && p.category === category)
            .slice(0, 4);
    }

    // Se não houver produtos da mesma categoria, pegar aleatórios
    if (related.length === 0) {
        related = allProducts.filter(p => p.id !== currentProduct.id).sort(() => 0.5 - Math.random()).slice(0, 4);
    }

    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    container.innerHTML = related.map(p => `
        <div class="related-product-card" onclick="window.location.href='produto.html?id=${p.id}'" style="cursor: pointer; background: white; border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;">
            <div style="aspect-ratio: 1; background: #f8fafc; background-image: url('${p.image || 'https://via.placeholder.com/300'}'); background-size: cover; background-position: center;"></div>
            <div style="padding: 15px;">
                <h4 style="font-size: 0.95rem; margin-bottom: 8px; color: #1e293b; font-weight: 600;">${p.name}</h4>
                <div style="color: ${isLoggedIn ? '#f97316' : '#64748b'}; font-weight: 700; font-size: 1.1rem;">
                    ${isLoggedIn ? `R$ ${p.price.toFixed(2).replace('.', ',')}` : 'Sob Consulta'}
                </div>
            </div>
        </div>
    `).join('');

    // Adicionar hover effect via CSS
    const style = document.createElement('style');
    style.textContent = `
        .related-product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
    `;
    if (!document.getElementById('related-styles')) {
        style.id = 'related-styles';
        document.head.appendChild(style);
    }
}

// ✨ NOVO: Produtos Cross-Sell (Aproveite e Leve Também)
function loadCrossSellProducts() {
    const container = document.getElementById('cross-sell-grid');
    const section = document.getElementById('cross-sell-container');

    if (!container || !section) return;

    let allProducts = [];
    if (typeof productService !== 'undefined') {
        allProducts = productService.getAll();
    }
    if (allProducts.length === 0) {
        allProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
    }

    // Lógica de Cross Sell: Pegar produtos pequenos/baratos, preferencialmente "Papelaria" ou "Acessórios"
    let crossSellItems = allProducts.filter(p =>
        p.id !== currentProduct.id &&
        (p.category === 'Papelaria' || p.category === 'Acessórios' || (p.price && p.price < 50))
    );

    // Se a categoria do produto atual for Apostila, foque em itens de papelaria
    if (currentProduct && currentProduct.category === 'Apostilas') {
        crossSellItems = crossSellItems.sort(() => 0.5 - Math.random()).slice(0, 5);
    } else {
        // Fallback genérico
        crossSellItems = allProducts.filter(p => p.id !== currentProduct.id).sort(() => 0.5 - Math.random()).slice(0, 5);
    }

    if (crossSellItems.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';

    container.innerHTML = crossSellItems.map(p => {
        // Preço Formatado
        const priceFormatted = `R$ ${p.price.toFixed(2).replace('.', ',')}`;

        // Custom add to cart function for quick inline adding
        return `
        <div class="cross-card">
            <div class="cross-img" style="background-image: url('${p.image || 'https://via.placeholder.com/200'}');"></div>
            <div class="cross-title" title="${p.name}">${p.name}</div>
            <div class="cross-price">${priceFormatted}</div>
            <button class="cross-btn" onclick="addCrossSellToCart('${p.id}', ${p.price}, '${p.name.replace(/'/g, "\\'")}', '${p.image}')">
                <i class="ph-bold ph-plus"></i> Adicionar
            </button>
        </div>
        `;
    }).join('');
}

// ✨ Função auxiliar para o botão rápido do Cross Sell
window.addCrossSellToCart = function (id, price, name, image) {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();
    if (!isLoggedIn) {
        Swal.fire({
            icon: 'info', title: 'Login Necessário', text: 'Faça login para adicionar ao carrinho.',
            confirmButtonText: 'Ir para Login', confirmButtonColor: '#f97316'
        }).then((result) => { if (result.isConfirmed) window.location.href = 'login.html'; });
        return;
    }

    const item = {
        id: id,
        name: name,
        price: price,
        image: image,
        pricing_type: 'standard' // Cross-sell items are usually standard
    };

    // Minimal Qty for cross sell items (usually 1 or basic minimum) 
    // In a real scenario we might need to check the product's actual minimum
    let qty = 1;

    // Assuming we have cartService injected globally
    if (window.cartService) {
        window.cartService.addToCart(item, qty, '');

        // Feedback Visual
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });

        Toast.fire({
            icon: 'success',
            title: 'Adicionado ao carrinho!'
        });
        updateCartBadge();

        // Opcional: Abrir o carrinho automaticamente
        // window.cartService.toggle();
    }
};

// Update Cart Badge
function updateCartBadge() {
    if (!window.cartService) return;

    const count = window.cartService.getCount();
    const btn = document.getElementById('cart-float-btn');
    const badge = document.getElementById('cart-badge');

    if (badge) badge.innerText = count;
    if (btn) btn.style.display = count > 0 ? 'flex' : 'none';
}

// Cart Event Listener
document.addEventListener('cart:updated', (e) => {
    updateCartBadge();
});

// ==========================================
// ENTERPRISE PRODUCT CONFIGURATOR ENGINE
// ==========================================

window.configuratorState = {
    selections: {}, // { groupIndex: optionIndex }
    totalModifier: 0
};

window.renderConfigurator = function () {
    const container = document.getElementById('product-configuration-area');
    if (!container) return;

    // Clear previous state
    window.configuratorState = { selections: {}, totalModifier: 0 };
    container.innerHTML = '';
    container.style.display = 'none';

    if (!currentProduct || !currentProduct.configuration_rules || currentProduct.configuration_rules.length === 0) {
        return;
    }

    container.style.display = 'block';

    // Header
    const header = document.createElement('h4');
    header.innerText = 'Personalize seu Produto:';
    header.style.fontSize = '0.95rem';
    header.style.color = '#334155';
    header.style.marginBottom = '10px';
    container.appendChild(header);

    currentProduct.configuration_rules.forEach((group, groupIndex) => {
        const groupDiv = document.createElement('div');
        groupDiv.style.marginBottom = '15px';

        const label = document.createElement('label');
        label.innerText = group.name;
        label.style.display = 'block';
        label.style.fontSize = '0.85rem';
        label.style.color = '#64748b';
        label.style.marginBottom = '5px';
        groupDiv.appendChild(label);

        if (group.type === 'select') {
            const select = document.createElement('select');
            select.className = 'custom-select'; // Use existing class if available
            select.style.width = '100%';
            select.style.padding = '8px';
            select.style.border = '1px solid #cbd5e1';
            select.style.borderRadius = '6px';

            // Add default option
            const defOpt = document.createElement('option');
            defOpt.value = "";
            defOpt.innerText = "Selecione...";
            select.appendChild(defOpt);

            group.options.forEach((opt, optIndex) => {
                const option = document.createElement('option');
                option.value = optIndex;
                const priceText = opt.price_mod > 0 ? ` (+R$ ${opt.price_mod.toFixed(2)})` : '';
                option.innerText = `${opt.label}${priceText}`;
                select.appendChild(option);
            });

            select.onchange = (e) => window.handleConfigChange(groupIndex, e.target.value);
            groupDiv.appendChild(select);

        } else {
            // Radio / Checkbox (Implementing Radio for now as it's simpler for single selection)
            group.options.forEach((opt, optIndex) => {
                const wrapper = document.createElement('div');
                wrapper.style.display = 'flex';
                wrapper.style.alignItems = 'center';
                wrapper.style.marginBottom = '5px';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `config-group-${groupIndex}`;
                input.id = `config-opt-${groupIndex}-${optIndex}`;
                input.value = optIndex;
                input.style.marginRight = '8px';

                input.onchange = () => window.handleConfigChange(groupIndex, optIndex);

                const labelOpt = document.createElement('label');
                labelOpt.htmlFor = `config-opt-${groupIndex}-${optIndex}`;
                const priceText = opt.price_mod > 0 ? ` <span style="color:var(--primary-hero); font-weight:600;">(+R$ ${opt.price_mod.toFixed(2)})</span>` : '';
                labelOpt.innerHTML = `${opt.label}${priceText}`;
                labelOpt.style.fontSize = '0.9rem';
                labelOpt.style.cursor = 'pointer';

                wrapper.appendChild(input);
                wrapper.appendChild(labelOpt);
                groupDiv.appendChild(wrapper);
            });
        }

        container.appendChild(groupDiv);
    });
};

window.handleConfigChange = function (groupIndex, optionIndex) {
    if (optionIndex === "" || optionIndex === null) {
        delete window.configuratorState.selections[groupIndex];
    } else {
        window.configuratorState.selections[groupIndex] = parseInt(optionIndex);
    }

    // Recalculate Modifier
    let totalMod = 0;
    Object.entries(window.configuratorState.selections).forEach(([gIdx, oIdx]) => {
        const group = currentProduct.configuration_rules[gIdx];
        if (group && group.options[oIdx]) {
            totalMod += (group.options[oIdx].price_mod || 0);
        }
    });

    window.configuratorState.totalModifier = totalMod;

    updateTotal();
};


// Init
window.addEventListener('load', () => {
    loadProduct();
    // Start Supabase if needed
    if (window.supabase) console.log('Supabase Ready');
});

// ===== LIGHTBOX FUNCTIONS =====
function openLightbox(index) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    currentImageIndex = index;
    lightboxImage.src = window.productImages[currentImageIndex];
    updateLightboxCounter();

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
    // Only close if clicking overlay or close button
    if (event.target.id === 'lightbox' || event.target.closest('.lightbox-close')) {
        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        event.stopPropagation();
    }
}

function nextImage(event) {
    event.stopPropagation();
    currentImageIndex = (currentImageIndex + 1) % window.productImages.length;
    document.getElementById('lightbox-image').src = window.productImages[currentImageIndex];
    updateLightboxCounter();
}

function prevImage(event) {
    event.stopPropagation();
    currentImageIndex = (currentImageIndex - 1 + window.productImages.length) % window.productImages.length;
    document.getElementById('lightbox-image').src = window.productImages[currentImageIndex];
    updateLightboxCounter();
}

function updateLightboxCounter() {
    const counter = document.getElementById('lightbox-counter');
    counter.innerText = `${currentImageIndex + 1} / ${window.productImages.length}`;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    } else if (e.key === 'ArrowRight') {
        nextImage({ stopPropagation: () => { } });
    } else if (e.key === 'ArrowLeft') {
        prevImage({ stopPropagation: () => { } });
    }
});

// ===== SHARE FUNCTIONS =====
function shareWhatsApp() {
    if (!currentProduct) return;

    const url = window.location.href;
    const text = `Confira este produto: ${currentProduct.name}\n\nVeja mais em: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
}

function shareEmail() {
    if (!currentProduct) return;

    const url = window.location.href;
    const subject = `Produto: ${currentProduct.name}`;
    const body = `Olá!\n\n Encontrei este produto que pode te interessar:\n\n${currentProduct.name}\n\nVeja mais em: ${url}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function copyLink() {
    const url = window.location.href;

    navigator.clipboard.writeText(url).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Link copiado!',
            text: 'Link do produto copiado.',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }).catch(() => {
        Swal.fire({
            icon: 'info',
            title: url,
            confirmButtonText: 'Fechar'
        });
    });
}

// ===== REVIEWS FUNCTIONS =====
async function loadReviews() {
    if (!currentProduct) return;

    try {
        // Buscar avaliações reais do Supabase
        if (!window.supabase) {
            console.warn('Supabase não disponível. Reviews não serão carregadas.');
            renderReviews([]);
            return;
        }

        const { data: reviews, error } = await window.supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', currentProduct.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar reviews:', error);
            renderReviews([]);
            return;
        }

        // Converter formato do banco para formato esperado pela UI
        // Bug fix #2: Adiciona null check para evitar crash
        const formattedReviews = (reviews || []).map(r => ({
            id: r.id,
            productId: r.product_id,
            userName: r.user_name,
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString('pt-BR'),
            comment: r.comment,
            verified: r.verified
        }));

        renderReviews(formattedReviews);

    } catch (err) {
        console.error('Erro ao carregar reviews:', err);
        renderReviews([]);
    }
}

function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviews-list');
    const ratingNumber = document.getElementById('rating-number');
    const starsSummary = document.getElementById('stars-summary');
    const reviewsCount = document.getElementById('reviews-count');

    if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<div class="reviews-empty"><i class="ph-duotone ph-star"></i><p>Seja o primeiro a avaliar este produto!</p></div>';
        // Bug fix #3: Resetar elementos de rating quando não há reviews
        ratingNumber.textContent = '0,0';
        starsSummary.innerHTML = renderStars(0);
        reviewsCount.textContent = '(0)';
        return;
    }

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    ratingNumber.textContent = avgRating.toFixed(1);
    reviewsCount.textContent = `média de ${reviews.length} avaliações do produto`;

    const fullStars = Math.floor(avgRating);
    starsSummary.innerHTML = Array.from({ length: 5 }, (_, i) => i < fullStars ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('');

    reviewsList.innerHTML = reviews.map(review => {
        const initial = review.userName.charAt(0).toUpperCase();
        const stars = Array.from({ length: 5 }, (_, i) => i < review.rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('');

        return `<div class="review-item">
            <div class="review-user">
                <div class="review-avatar">${initial}</div>
                <div class="review-user-info">
                    <div class="review-user-name">${review.userName}</div>
                    <div class="review-date">${review.date}</div>
                </div>
            </div>
            <div class="review-stars">${stars}</div>
            ${review.verified ? '<div class="review-verified"><i class="ph-bold ph-check-circle"></i> Compra verificada</div>' : ''}
            <div class="review-text">${review.comment}</div>
        </div>`;
    }).join('');

    checkIfUserCanReview();
}

function checkIfUserCanReview() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();
    const writeBtn = document.getElementById('write-review-btn');

    if (!isLoggedIn) {
        writeBtn.style.display = 'none';
        return;
    }

    // ✅ IMPLEMENTADO: Verificação real de compra
    if (typeof window.updateReviewButtonState === 'function') {
        window.updateReviewButtonState();
    } else {
        // Fallback caso produto-reviews.js não carregue
        writeBtn.style.display = 'flex';
    }

    // Auto-abrir modal se veio de link de notificação
    checkAutoOpenReview();
}

function checkAutoOpenReview() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('review') === 'true') {
        // Usuário veio do email/notificação
        setTimeout(() => {
            openReviewModal();
            // Limpar parâmetro da URL
            const newUrl = window.location.pathname + '?id=' + currentProduct.id;
            window.history.replaceState({}, '', newUrl);
        }, 1000);
    }
}

function openReviewModal() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    if (!isLoggedIn) {
        Swal.fire({
            icon: 'info',
            title: 'Login Necessário',
            text: 'Faça login para avaliar este produto.',
            confirmButtonText: 'Ir para Login',
            confirmButtonColor: '#f97316'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'login.html';
        });
        return;
    }

    let selectedRating = 0;

    Swal.fire({
        title: 'Avaliar Produto',
        html: `
            <div style="text-align:left;">
                <p style="margin-bottom:10px;font-weight:600;">Nota:</p>
                <div id="rating-stars" style="font-size:2rem;color:#e5e7eb;margin-bottom:20px;cursor:pointer;">
                    <i class="ph-fill ph-star" data-rating="1"></i>
                    <i class="ph-fill ph-star" data-rating="2"></i>
                    <i class="ph-fill ph-star" data-rating="3"></i>
                    <i class="ph-fill ph-star" data-rating="4"></i>
                    <i class="ph-fill ph-star" data-rating="5"></i>
                </div>
                <textarea id="review-comment" class="swal2-textarea" placeholder="Conte sua experiência com este produto..." rows="4"></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Enviar Avaliação',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f97316',
        width: '600px',
        didOpen: () => {
            const stars = document.querySelectorAll('#rating-stars i');
            stars.forEach((star, i) => {
                star.addEventListener('click', () => {
                    selectedRating = i + 1;
                    stars.forEach((s, idx) => s.style.color = idx < selectedRating ? '#f97316' : '#e5e7eb');
                });
            });
        },
        preConfirm: () => {
            const comment = document.getElementById('review-comment').value;

            if (selectedRating === 0) {
                Swal.showValidationMessage('Por favor, selecione uma nota de 1 a 5 estrelas');
                return false;
            }
            if (!comment.trim()) {
                Swal.showValidationMessage('Por favor, escreva um comentário sobre o produto');
                return false;
            }

            return { rating: selectedRating, comment: comment.trim() };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { rating, comment } = result.value;

            // Salvar no Supabase
            const saved = await saveReview(currentProduct.id, rating, comment);

            if (saved) {
                Swal.fire({
                    icon: 'success',
                    title: 'Avaliação enviada!',
                    text: 'Obrigado pelo seu feedback! Sua avaliação ajuda outros clientes.',
                    confirmButtonColor: '#10b981',
                    timer: 3000
                }).then(() => {
                    // Recarregar avaliações
                    loadReviews();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao enviar',
                    text: 'Não foi possível salvar sua avaliação. Tente novamente.',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    });
}

// Função para salvar avaliação no Supabase
async function saveReview(productId, rating, comment) {
    // ✅ Usar versão melhorada com verificação de compra
    if (typeof window.saveReviewEnhanced === 'function') {
        return await window.saveReviewEnhanced(productId, rating, comment);
    }

    // Fallback para versão original
    try {
        if (!window.supabase) {
            throw new Error('Supabase não disponível');
        }

        const user = window.authService?.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const { data, error } = await window.supabase
            .from('product_reviews')
            .insert([
                {
                    product_id: productId,
                    user_id: user.id,
                    user_name: user.name || user.email || 'Usuário',
                    rating: rating,
                    comment: comment,
                    verified: false // Admin pode marcar como verificado depois
                }
            ])
            .select();

        if (error) {
            console.error('Erro ao salvar review:', error);
            return false;
        }

        console.log('Review salva com sucesso:', data);
        return true;

    } catch (err) {
        console.error('Erro ao salvar review:', err);
        return false;
    }
}

// Helper para stars (usado no fallback se renderReviews for chamado sem reviews)
function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => i < rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('');
}

window.addEventListener('load', () => { setTimeout(() => loadReviews(), 500); });
