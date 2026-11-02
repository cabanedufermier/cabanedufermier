/* ====================================================================
   CABANE DU FERMIER — Espace DAF / Direction (Validation des Versements)
   ==================================================================== */

const SUPABASE_URL = 'https://tfsbmtsyegbxijyvxpta.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OAr80mY9z0eXbMh5VxxF-A_ps9xk61R';
const DAF_PIN = 'cdf@gmail.com'; // Code d'accès rapide DAF (peut être personnalisé)

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const lockScreen = document.getElementById('lockScreen');
    const adminDashboard = document.getElementById('adminDashboard');
    const navAdminActions = document.getElementById('navAdminActions');
    const pinForm = document.getElementById('pinForm');
    const pinInput = document.getElementById('pinInput');
    const lockError = document.getElementById('lockError');
    const btnAdminLogout = document.getElementById('btnAdminLogout');
    const btnRefresh = document.getElementById('btnRefresh');

    const kpiPendingCount = document.getElementById('kpiPendingCount');
    const kpiPendingAmount = document.getElementById('kpiPendingAmount');
    const kpiValidatedCount = document.getElementById('kpiValidatedCount');
    const tabCountPending = document.getElementById('tabCountPending');
    const tabCountValid = document.getElementById('tabCountValid');
    const tabCountAll = document.getElementById('tabCountAll');
    const displayCount = document.getElementById('displayCount');
    const ordersList = document.getElementById('ordersList');
    const toastBox = document.getElementById('toastBox');

    let allOrders = [];
    let allVendeurs = {};
    let currentFilter = 'en_attente';

    // 1. Déverrouillage PIN DAF
    function checkAuth() {
        const isAuth = sessionStorage.getItem('cdf_daf_auth') === 'true';
        if (isAuth) {
            lockScreen.style.display = 'none';
            adminDashboard.style.display = 'block';
            navAdminActions.style.display = 'block';
            loadAllData();
        } else {
            lockScreen.style.display = 'block';
            adminDashboard.style.display = 'none';
            navAdminActions.style.display = 'none';
        }
    }

    pinForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = pinInput.value.trim();
        if (code === DAF_PIN || code === '2026') {
            sessionStorage.setItem('cdf_daf_auth', 'true');
            if (lockError) lockError.style.display = 'none';
            checkAuth();
        } else {
            if (lockError) {
                lockError.textContent = "Code d'accès incorrect.";
                lockError.style.display = 'block';
            }
        }
    });

    btnAdminLogout?.addEventListener('click', () => {
        sessionStorage.removeItem('cdf_daf_auth');
        window.location.reload();
    });

    btnRefresh?.addEventListener('click', () => {
        loadAllData();
        showToast('Données actualisées !');
    });

    // 2. Chargement de toutes les données Supabase
    async function loadAllData() {
        ordersList.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-muted);"><i data-lucide="loader" class="icon-md" style="animation: spin 1s linear infinite;"></i><br><br>Chargement des commandes...</div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        try {
            // Charger les vendeurs
            const { data: vendeursData } = await supabaseClient.from('vendeurs').select('*');
            allVendeurs = {};
            (vendeursData || []).forEach(v => {
                allVendeurs[v.id] = v;
            });

            // Charger les commandes
            const { data: ordersData, error: ordersErr } = await supabaseClient
                .from('commandes_affiliation')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersErr) throw ordersErr;

            allOrders = ordersData || [];
            updateKPIs();
            renderOrders();

        } catch (err) {
            console.error('Erreur chargement DAF:', err);
            ordersList.innerHTML = `<div style="text-align: center; padding: 2rem; color: #ef4444;">Erreur lors du chargement des commandes : ${err.message}</div>`;
        }
    }

    // 3. Calcul des KPIs
    function updateKPIs() {
        let pendingCount = 0;
        let pendingAmount = 0;
        let validatedCount = 0;

        allOrders.forEach(o => {
            if (o.statut === 'en_attente') {
                pendingCount++;
                pendingAmount += Number(o.montant_commission || 0);
            } else if (o.statut === 'validee') {
                validatedCount++;
            }
        });

        if (kpiPendingCount) kpiPendingCount.textContent = pendingCount;
        if (kpiPendingAmount) kpiPendingAmount.textContent = `${pendingAmount.toLocaleString('fr-FR')} F`;
        if (kpiValidatedCount) kpiValidatedCount.textContent = validatedCount;

        if (tabCountPending) tabCountPending.textContent = pendingCount;
        if (tabCountValid) tabCountValid.textContent = validatedCount;
        if (tabCountAll) tabCountAll.textContent = allOrders.length;
    }

    // 4. Filtres par statut
    document.querySelectorAll('.tab-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-filter-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.getAttribute('data-filter');
            renderOrders();
        });
    });

    // 5. Affichage des commandes
    function renderOrders() {
        let filtered = allOrders;
        if (currentFilter === 'en_attente') {
            filtered = allOrders.filter(o => o.statut === 'en_attente');
        } else if (currentFilter === 'validee') {
            filtered = allOrders.filter(o => o.statut === 'validee');
        }

        if (displayCount) displayCount.textContent = filtered.length;

        if (filtered.length === 0) {
            ordersList.innerHTML = `
                <div style="background: #ffffff; border-radius: var(--radius-lg); padding: 3rem; text-align: center; color: var(--text-muted); border: 1px solid var(--border);">
                    <i data-lucide="check-circle-2" class="icon-lg" style="color: #10b981; margin-bottom: 0.5rem;"></i>
                    <p><strong>Aucune commande dans cette catégorie</strong></p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        ordersList.innerHTML = filtered.map(o => {
            const vendeur = allVendeurs[o.vendeur_id] || { nom_complet: 'Vendeur Inconnu', code_promo: '---', numero_momo: '' };
            const cleanTel = (o.client_tel || '').replace(/[\s\-\(\)]/g, '');
            const waClientUrl = cleanTel ? `https://wa.me/${cleanTel.startsWith('229') ? cleanTel : '229' + cleanTel}` : '#';

            const statusLabel = o.statut === 'validee' ? 'Validée (Payée)' : (o.statut === 'en_attente' ? 'En attente de paiement' : 'Annulée');

            return `
                <div class="order-card-daf" id="order-card-${o.id}">
                    <div class="order-card-header">
                        <div class="order-date">
                            <i data-lucide="calendar" class="icon-xs" style="vertical-align: middle;"></i>
                            ${new Date(o.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        <span class="status-badge status-${o.statut}">
                            ${o.statut === 'validee' ? '<i data-lucide="check-circle" class="icon-xs"></i>' : (o.statut === 'en_attente' ? '<i data-lucide="clock" class="icon-xs"></i>' : '<i data-lucide="x-circle" class="icon-xs"></i>')}
                            ${statusLabel}
                        </span>
                    </div>

                    <div class="order-body-grid">
                        <div class="info-col">
                            <label>Client</label>
                            <div class="value">${o.client_nom || 'Client'}</div>
                            <small style="color: var(--text-muted); font-size: 0.8rem;">${o.client_tel || ''}</small>
                        </div>

                        <div class="info-col">
                            <label>Montant Commande</label>
                            <div class="value">${Number(o.montant_total || 0).toLocaleString('fr-FR')} F CFA</div>
                            <small style="color: var(--text-muted); font-size: 0.78rem;">Éligible commission : ${Number(o.montant_eligible || 0).toLocaleString('fr-FR')} F</small>
                        </div>

                        <div class="info-col">
                            <label>Ambassadeur Associé</label>
                            <div class="value promo">${vendeur.code_promo || 'CODE'}</div>
                            <small style="color: var(--text-muted); font-size: 0.8rem; display: block;">${vendeur.nom_complet}</small>
                        </div>

                        <div class="info-col">
                            <label>Commission à verser</label>
                            <div class="value commission">+${Number(o.montant_commission || 0).toLocaleString('fr-FR')} F CFA</div>
                            <small style="color: var(--text-muted); font-size: 0.78rem;">Taux : ${o.taux_commission || 5}%</small>
                        </div>
                    </div>

                    <div class="order-actions-row">
                        ${cleanTel ? `
                            <a href="${waClientUrl}" target="_blank" class="btn-whatsapp-client">
                                <i data-lucide="message-circle" class="icon-xs"></i> Écrire au client
                            </a>
                        ` : ''}

                        ${o.statut === 'en_attente' ? `
                            <button type="button" class="btn-reject-order" onclick="rejectOrder('${o.id}')">
                                <i data-lucide="x" class="icon-xs"></i> Annuler
                            </button>
                            <button type="button" class="btn-validate-pay" onclick="validateOrderPayment('${o.id}', '${o.vendeur_id}', ${o.montant_commission})">
                                <i data-lucide="check-check" class="icon-sm"></i>
                                Valider le versement (Paiement reçu)
                            </button>
                        ` : (o.statut === 'validee' ? `
                            <span style="color: #059669; font-weight: 700; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                                ✓ Commission créditée sur le Wallet de ${vendeur.nom_complet}
                            </span>
                        ` : `
                            <span style="color: #ef4444; font-weight: 600; font-size: 0.85rem;">Commande annulée</span>
                        `)}
                    </div>
                </div>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // 6. Action DAF : Validation en 1 clic
    window.validateOrderPayment = async function(orderId, vendeurId, commissionAmount) {
        const card = document.getElementById(`order-card-${orderId}`);
        const btn = card?.querySelector('.btn-validate-pay');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader" class="icon-xs" style="animation: spin 1s linear infinite;"></i> Validation...`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        try {
            // 1. Mettre à jour le statut de la commande à 'validee'
            const { error: orderError } = await supabaseClient
                .from('commandes_affiliation')
                .update({ statut: 'validee' })
                .eq('id', orderId);

            if (orderError) throw orderError;

            // 2. Créditer le solde du Wallet du vendeur
            if (vendeurId && commissionAmount > 0) {
                // Récupérer le solde actuel
                const { data: vProfile } = await supabaseClient
                    .from('vendeurs')
                    .select('solde_wallet, nom_complet')
                    .eq('id', vendeurId)
                    .single();

                const nouveauSolde = Number(vProfile?.solde_wallet || 0) + Number(commissionAmount);

                await supabaseClient
                    .from('vendeurs')
                    .update({ solde_wallet: nouveauSolde })
                    .eq('id', vendeurId);
            }

            // Confetti joyeux pour le DAF !
            if (typeof confetti !== 'undefined') {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
            }

            const vendeurNom = allVendeurs[vendeurId]?.nom_complet || 'le vendeur';
            showToast(`✓ Versement validé ! Le Wallet de ${vendeurNom} a été crédité de ${Number(commissionAmount).toLocaleString('fr-FR')} F.`);

            // Recharger les données
            setTimeout(loadAllData, 500);

        } catch (err) {
            console.error('Erreur validation DAF:', err);
            alert(`Erreur lors de la validation : ${err.message}`);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = `<i data-lucide="check-check" class="icon-sm"></i> Valider le versement (Paiement reçu)`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }
    };

    // 7. Action DAF : Rejeter / Annuler une commande
    window.rejectOrder = async function(orderId) {
        if (!confirm("Voulez-vous vraiment marquer cette commande comme annulée ? Aucune commission ne sera versée.")) {
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('commandes_affiliation')
                .update({ statut: 'annulee' })
                .eq('id', orderId);

            if (error) throw error;
            showToast("Commande marquée comme annulée.");
            loadAllData();
        } catch (err) {
            alert(`Erreur : ${err.message}`);
        }
    };

    function showToast(msg) {
        if (!toastBox) return;
        toastBox.textContent = msg;
        toastBox.style.display = 'block';
        setTimeout(() => {
            toastBox.style.display = 'none';
        }, 3500);
    }

    checkAuth();
});
