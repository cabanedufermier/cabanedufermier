/* ====================================================================
   CABANE DU FERMIER — Espace Vendeur & Ambassadeur (Supabase Engine)
   ==================================================================== */

const SUPABASE_URL = 'https://tfsbmtsyegbxijyvxpta.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_OAr80mY9z0eXbMh5VxxF-A_ps9xk61R';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', async () => {
    // Initialisation icônes Lucide
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Éléments du DOM
    const authSection = document.getElementById('authSection');
    const dashSection = document.getElementById('dashSection');
    const navUserActions = document.getElementById('navUserActions');
    const authAlert = document.getElementById('authAlert');

    // Onglets Auth
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Boutons & Modale
    const btnSignOut = document.getElementById('btnSignOut');
    const retraitModal = document.getElementById('retraitModal');
    const btnOpenRetraitModal = document.getElementById('btnOpenRetraitModal');
    const btnCloseRetraitModal = document.getElementById('btnCloseRetraitModal');
    const retraitForm = document.getElementById('retraitForm');

    // Affichage Stats
    const vendeurName = document.getElementById('vendeurName');
    const currentTierRate = document.getElementById('currentTierRate');
    const walletSolde = document.getElementById('walletSolde');
    const monthlyClientsCount = document.getElementById('monthlyClientsCount');
    const totalCommissionsEver = document.getElementById('totalCommissionsEver');
    const progressBarFill = document.getElementById('progressBarFill');
    const tierNextGoal = document.getElementById('tierNextGoal');
    const tier1 = document.getElementById('tier1');
    const tier2 = document.getElementById('tier2');
    const tier3 = document.getElementById('tier3');

    // Partage & QR Code
    const qrcodeContainer = document.getElementById('qrcodeContainer');
    const myPromoCodeDisplay = document.getElementById('myPromoCodeDisplay');
    const btnCopyLink = document.getElementById('btnCopyLink');
    const btnShareWhatsapp = document.getElementById('btnShareWhatsapp');
    const btnDownloadQr = document.getElementById('btnDownloadQr');

    // Tables
    const ordersTableBody = document.getElementById('ordersTableBody');
    const withdrawalsTableBody = document.getElementById('withdrawalsTableBody');

    let currentVendeur = null;
    let qrCodeInstance = null;

    function showAlert(msg, type = 'error') {
        if (!authAlert) return;
        authAlert.textContent = msg;
        authAlert.className = `alert-box alert-${type}`;
        authAlert.style.display = 'block';
    }

    function clearAlert() {
        if (authAlert) authAlert.style.display = 'none';
    }

    // Gestion des onglets Login / Register
    tabLoginBtn?.addEventListener('click', () => {
        tabLoginBtn.classList.add('active');
        tabRegisterBtn.classList.remove('active');
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
        clearAlert();
    });

    tabRegisterBtn?.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active');
        tabLoginBtn.classList.remove('active');
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
        clearAlert();
    });

    // ----- 1. CONNEXION -----
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('btnLoginSubmit');

        btn.disabled = true;
        btn.textContent = 'Connexion en cours...';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            await loadVendeurDashboard(data.user);
        } catch (err) {
            showAlert(err.message || 'Identifiants incorrects.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Se Connecter';
        }
    });

    // ----- 2. INSCRIPTION VENDEUR -----
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAlert();

        const nom = document.getElementById('regNom').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const tel = document.getElementById('regTel').value.trim();
        const codePromo = document.getElementById('regCodePromo').value.trim().toUpperCase();
        const momo = document.getElementById('regMomo').value.trim();
        const reseau = document.getElementById('regMomoReseau').value;
        const password = document.getElementById('regPassword').value;
        const btn = document.getElementById('btnRegisterSubmit');

        if (!codePromo.startsWith('CDF-')) {
            showAlert('Votre code promo doit commencer par CDF- (ex: CDF-ALAIN).');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Création du compte...';

        try {
            // Création de l'utilisateur Auth
            const { data: authData, error: authError } = await supabaseClient.auth.signUp({
                email,
                password
            });

            if (authError) throw authError;

            // Insertion dans la table vendeurs
            const { error: profileError } = await supabaseClient.from('vendeurs').insert([{
                id: authData.user.id,
                nom_complet: nom,
                telephone: tel,
                code_promo: codePromo,
                numero_momo: momo,
                reseau_momo: reseau,
                solde_wallet: 0
            }]);

            if (profileError) {
                if (profileError.message.includes('unique')) {
                    throw new Error('Ce code promo est déjà pris par un autre vendeur. Choisissez-en un autre.');
                }
                throw profileError;
            }

            showAlert('Compte créé avec succès ! Chargement de votre espace...', 'success');
            setTimeout(async () => {
                await loadVendeurDashboard(authData.user);
            }, 800);

        } catch (err) {
            showAlert(err.message || 'Erreur lors de la création du compte.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Créer mon compte Ambassadeur';
        }
    });

    // ----- 3. DÉCONNEXION -----
    btnSignOut?.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload();
    });

    // ----- 4. CHARGEMENT DU DASHBOARD & STATS -----
    async function loadVendeurDashboard(user) {
        if (!user) return;

        // Récupérer le profil vendeur
        const { data: profile, error } = await supabaseClient
            .from('vendeurs')
            .select('*')
            .eq('id', user.id)
            .single();

        if (error || !profile) {
            showAlert("Profil vendeur introuvable.");
            return;
        }

        currentVendeur = profile;

        // Afficher l'interface dashboard
        authSection.style.display = 'none';
        dashSection.style.display = 'block';
        navUserActions.style.display = 'block';

        vendeurName.textContent = profile.nom_complet;
        walletSolde.textContent = `${Number(profile.solde_wallet || 0).toLocaleString('fr-FR')} F`;
        myPromoCodeDisplay.textContent = profile.code_promo;

        // Générer le QR Code pointant vers le site avec ?ref=CODE_PROMO
        generatePartnerQrCode(profile.code_promo);

        // Charger les commandes affiliées
        await loadVendeurOrders(profile.id);

        // Charger les demandes de retrait
        await loadVendeurWithdrawals(profile.id);

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ----- 5. QR CODE & PARTAGE -----
    function generatePartnerQrCode(codePromo) {
        const affiliateUrl = `${window.location.origin}/?ref=${encodeURIComponent(codePromo)}`;
        
        if (qrcodeContainer) {
            qrcodeContainer.innerHTML = '';
            qrCodeInstance = new QRCode(qrcodeContainer, {
                text: affiliateUrl,
                width: 170,
                height: 170,
                colorDark: "#1b4332",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        // Bouton Copier le lien
        btnCopyLink?.addEventListener('click', () => {
            navigator.clipboard.writeText(affiliateUrl).then(() => {
                btnCopyLink.textContent = '✓ Lien copié !';
                setTimeout(() => { btnCopyLink.innerHTML = '<i data-lucide="copy" class="icon-xs"></i> Copier mon lien affilié'; if (typeof lucide !== 'undefined') lucide.createIcons(); }, 2000);
            });
        });

        // Bouton Partager WhatsApp
        btnShareWhatsapp?.addEventListener('click', () => {
            const shareMsg = `Bonjour ! 🌿 Profitez de *5% de réduction* sur vos commandes de poulets fermiers, cailles et viandes fraîches à la Cabane du Fermier avec mon code promo *${codePromo}* !\n\nCommandez directement ici : ${affiliateUrl}`;
            window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
        });

        // Télécharger le QR Code en image PNG
        btnDownloadQr?.addEventListener('click', () => {
            const img = qrcodeContainer.querySelector('img');
            if (img && img.src) {
                const a = document.createElement('a');
                a.href = img.src;
                a.download = `QR-Code-${codePromo}-CabaneDuFermier.png`;
                a.click();
            }
        });
    }

    // ----- 6. CHARGER LES COMMANDES & CALCULER LA GAMIFICATION -----
    async function loadVendeurOrders(vendeurId) {
        const { data: orders, error } = await supabaseClient
            .from('commandes_affiliation')
            .select('*')
            .eq('vendeur_id', vendeurId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur chargement commandes:', error);
            return;
        }

        // Calculs gamification mois courant
        const currentMonth = new Date().toISOString().slice(0, 7); // Ex: '2026-11'
        const monthlyOrders = (orders || []).filter(o => o.created_at && o.created_at.startsWith(currentMonth));
        const clientsCount = monthlyOrders.length;
        monthlyClientsCount.textContent = clientsCount;

        // Total gains cumulés
        let totalCommissions = 0;
        (orders || []).forEach(o => {
            if (o.statut === 'validee') totalCommissions += Number(o.montant_commission || 0);
        });
        totalCommissionsEver.textContent = `${totalCommissions.toLocaleString('fr-FR')} F`;

        // Barème du DAF :
        // 0 à 10 clients => 5%
        // 11 à 30 clients => 7%
        // Plus de 30 clients => 10%
        let currentRate = 5;
        let progressPercent = 0;
        let nextGoalText = '';

        if (clientsCount <= 10) {
            currentRate = 5;
            progressPercent = (clientsCount / 10) * 33;
            nextGoalText = `Plus que ${11 - clientsCount} client(s) pour passer au taux de 7% !`;
            tier1.classList.add('active');
            tier2.classList.remove('active');
            tier3.classList.remove('active');
        } else if (clientsCount <= 30) {
            currentRate = 7;
            progressPercent = 33 + ((clientsCount - 10) / 20) * 33;
            nextGoalText = `Super ! Plus que ${31 - clientsCount} client(s) pour débloquer les 10% !`;
            tier1.classList.remove('active');
            tier2.classList.add('active');
            tier3.classList.remove('active');
        } else {
            currentRate = 10;
            progressPercent = 100;
            nextGoalText = `🏆 Félicitations ! Vous êtes au niveau maximal (10% de commission) !`;
            tier1.classList.remove('active');
            tier2.classList.remove('active');
            tier3.classList.add('active');
        }

        currentTierRate.textContent = `${currentRate}%`;
        progressBarFill.style.width = `${Math.min(100, Math.max(5, progressPercent))}%`;
        tierNextGoal.textContent = nextGoalText;

        // Remplissage du tableau des commandes
        if (orders && orders.length > 0) {
            ordersTableBody.innerHTML = orders.map(o => `
                <tr>
                    <td>${new Date(o.created_at).toLocaleDateString('fr-FR')}</td>
                    <td><strong>${o.client_nom || 'Client'}</strong><br><small style="color:var(--text-muted);">${o.client_tel || ''}</small></td>
                    <td>${Number(o.montant_eligible || 0).toLocaleString('fr-FR')} F</td>
                    <td><strong>${o.taux_commission || 5}%</strong></td>
                    <td style="color: var(--primary); font-weight:700;">+${Number(o.montant_commission || 0).toLocaleString('fr-FR')} F</td>
                    <td><span class="status-badge status-${o.statut}">${o.statut === 'validee' ? 'Validée (Payée)' : (o.statut === 'en_attente' ? 'En cours de livraison' : 'Annulée')}</span></td>
                </tr>
            `).join('');
        } else {
            ordersTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Aucune commande affiliée enregistrée pour l'instant.</td></tr>`;
        }
    }

    // ----- 7. GESTION DES RETRAITS (1 PAR MOIS AVANT LE 15) -----
    async function loadVendeurWithdrawals(vendeurId) {
        const { data: withdrawals, error } = await supabaseClient
            .from('demandes_retrait')
            .select('*')
            .eq('vendeur_id', vendeurId)
            .order('date_demande', { ascending: false });

        if (error) {
            console.error('Erreur retraits:', error);
            return;
        }

        if (withdrawals && withdrawals.length > 0) {
            withdrawalsTableBody.innerHTML = withdrawals.map(w => `
                <tr>
                    <td>${new Date(w.date_demande).toLocaleDateString('fr-FR')}</td>
                    <td><strong>${w.mois_concerne}</strong></td>
                    <td style="font-weight: 700; color: var(--dark);">${Number(w.montant).toLocaleString('fr-FR')} F</td>
                    <td>${w.numero_momo} (${w.reseau_momo})</td>
                    <td><span class="status-badge status-${w.statut}">${w.statut === 'payee' ? 'Viré le ' + new Date(w.date_paiement).toLocaleDateString('fr-FR') : (w.statut === 'en_attente' ? 'En attente (Payable avant le 15)' : 'Rejetée')}</span></td>
                </tr>
            `).join('');
        } else {
            withdrawalsTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">Aucun retrait demandé pour l'instant.</td></tr>`;
        }
    }

    // Ouverture Modale Retrait
    btnOpenRetraitModal?.addEventListener('click', () => {
        if (!currentVendeur) return;
        const solde = Number(currentVendeur.solde_wallet || 0);
        document.getElementById('retraitAvailable').value = `${solde.toLocaleString('fr-FR')} F`;
        document.getElementById('retraitMontant').value = solde > 0 ? solde : '';
        document.getElementById('retraitMomoNum').value = currentVendeur.numero_momo || '';
        document.getElementById('retraitReseau').value = currentVendeur.reseau_momo || 'MTN';
        retraitModal.style.display = 'flex';
    });

    btnCloseRetraitModal?.addEventListener('click', () => {
        retraitModal.style.display = 'none';
    });

    // Soumission Retrait
    retraitForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const montant = Number(document.getElementById('retraitMontant').value);
        const momo = document.getElementById('retraitMomoNum').value.trim();
        const reseau = document.getElementById('retraitReseau').value;
        const solde = Number(currentVendeur.solde_wallet || 0);

        if (montant <= 0 || montant > solde) {
            alert('Le montant demandé doit être supérieur à 0 et inférieur ou égal à votre solde disponible.');
            return;
        }

        const currentMonth = new Date().toISOString().slice(0, 7);

        // Vérifier si une demande a déjà été faite ce mois-ci (1 retrait par mois max selon le DAF)
        const { data: existingRequests, error: checkErr } = await supabaseClient
            .from('demandes_retrait')
            .select('id')
            .eq('vendeur_id', currentVendeur.id)
            .eq('mois_concerne', currentMonth);

        if (existingRequests && existingRequests.length > 0) {
            alert('Vous avez déjà effectué votre demande de retrait pour ce mois. Conformément aux règles de gestion, un seul retrait est autorisé par mois.');
            return;
        }

        const btn = document.getElementById('btnSubmitRetrait');
        btn.disabled = true;
        btn.textContent = 'Envoi...';

        try {
            // Insertion de la demande
            const { error: insertErr } = await supabaseClient.from('demandes_retrait').insert([{
                vendeur_id: currentVendeur.id,
                montant,
                numero_momo: momo,
                reseau_momo: reseau,
                mois_concerne: currentMonth,
                statut: 'en_attente'
            }]);

            if (insertErr) throw insertErr;

            // Déduction temporaire du solde
            const newSolde = solde - montant;
            await supabaseClient.from('vendeurs').update({ solde_wallet: newSolde }).eq('id', currentVendeur.id);
            currentVendeur.solde_wallet = newSolde;

            alert('Demande de retrait enregistrée avec succès ! Le virement Mobile Money sera effectué avant le 15 du mois.');
            retraitModal.style.display = 'none';
            await loadVendeurDashboard(currentVendeur);
        } catch (err) {
            alert(err.message || 'Erreur lors de la demande de retrait.');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirmer';
        }
    });

    // Vérifier si session déjà active
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
        await loadVendeurDashboard(session.user);
    }
});
