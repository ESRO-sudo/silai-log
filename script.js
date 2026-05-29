if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log(err));
}

// FREE SECURE CLOUD DATABASE CONNECTOR
const firebaseConfig = {
    databaseURL: "https://silai-app-default-rtdb.firebaseio.com/"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// DOM Elements
const loginBlock = document.getElementById('loginBlock');
const mainApp = document.getElementById('mainApp');
const staffNameInput = document.getElementById('staffName');
const cardNoInput = document.getElementById('cardNo');
const userMobileInput = document.getElementById('userMobile');
const headerStaff = document.getElementById('headerStaff');

const entryDateInput = document.getElementById('entryDate');
const activityInput = document.getElementById('activity');
const itemSizeInput = document.getElementById('itemSize');
const quantityInput = document.getElementById('quantity');
const rateInput = document.getElementById('rate');
const reportMonthFilter = document.getElementById('reportMonthFilter');

const saveProfileBtn = document.getElementById('saveProfileBtn');
const saveEntryBtn = document.getElementById('saveEntryBtn');
const todayTableBody = document.querySelector('#todayTable tbody');

// Menu Elements
const menuBtn = document.getElementById('menuBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const menuEditProfile = document.getElementById('menuEditProfile');
const menuDownloadExcel = document.getElementById('menuDownloadExcel');
const menuInstallApp = document.getElementById('menuInstallApp');
const menuShareApp = document.getElementById('menuShareApp');
const menuHelp = document.getElementById('menuHelp');

let deferredPrompt;

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const offset = today.getTimezoneOffset();
    const localToday = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    entryDateInput.value = localToday;

    const savedName = localStorage.getItem('staffName');
    const savedCard = localStorage.getItem('cardNo');
    const savedMobile = localStorage.getItem('userMobile');

    setupMonthFilterOptions();

    if (savedName && savedCard && savedMobile) {
        showMainApp(savedName, savedCard);
        syncDataFromCloud(savedMobile);
    } else {
        showLogin();
    }

    // Dynamic entry date listener to update table for that specific date
    entryDateInput.addEventListener('change', updateTable);
});

// Three-Dot Menu Toggle
menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('hidden');
});
document.addEventListener('click', () => dropdownMenu.classList.add('hidden'));

// Menu Actions
menuEditProfile.addEventListener('click', () => {
    showLogin();
    dropdownMenu.classList.add('hidden');
});

// Help Box Feature
menuHelp.addEventListener('click', () => {
    alert("💡 मदद गाइड:\n1. रोज़ाना का काम चढ़ाने के लिए ४ इनपुट भरें और Save करें।\n2. यहाँ केवल आज का काम और आज की कुल कमाई दिखेगी।\n3. पूरे महीने की एक्सेल शीट डाउनलोड करने के लिए ऊपर थ्री-डॉट (⫶) मेनू पर क्लिक करें।");
    dropdownMenu.classList.add('hidden');
});

// Smart App Share Option
menuShareApp.addEventListener('click', async () => {
    dropdownMenu.classList.add('hidden');
    if (navigator.share) {
        try {
            await navigator.share({
                title: 'सिलाई उत्पादन लॉग',
                text: 'अपना रोज़ाना का सिलाई डेटा और सैलरी सुरक्षित रखने के लिए इस ऐप का उपयोग करें!',
                url: window.location.href
            });
        } catch (err) { console.log(err); }
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("App लिंक कॉपी हो गया है! आप इसे WhatsApp पर शेयर कर सकते हैं।");
    }
});

// Install App Feature
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    menuInstallApp.style.display = 'block';
});

menuInstallApp.addEventListener('click', async () => {
    dropdownMenu.classList.add('hidden');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') { console.log('User accepted app install'); }
        deferredPrompt = null;
    } else {
        alert("यह ऐप आपके ब्राउज़र में पहले से इंस्टॉल है या यह फीचर अभी उपलब्ध नहीं है। इसे होम स्क्रीन पर जोड़ने के लिए ब्राउज़र मेनू का उपयोग करें।");
    }
});

function syncDataFromCloud(mobile) {
    database.ref('users/' + mobile + '/entries').once('value', (snapshot) => {
        const cloudData = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                let item = childSnapshot.val();
                item.id = childSnapshot.key;
                cloudData.push(item);
            });
            localStorage.setItem('allEntries', JSON.stringify(cloudData));
            updateTable();
        } else {
            localStorage.setItem('allEntries', JSON.stringify([]));
            updateTable();
        }
    });
}

function getSalaryMonthGroup(dateString) {
    if (!dateString) return '';
    const parts = dateString.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]); 
    const day = parseInt(parts[2]);
    const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (day >= 26) {
        let nextMonth = month + 1; let nextYear = year;
        if (nextMonth > 12) { nextMonth = 1; nextYear = year + 1; }
        return `${monthsList[nextMonth - 1]}-${nextYear.toString().slice(-2)}`;
    } else {
        return `${monthsList[month - 1]}-${year.toString().slice(-2)}`;
    }
}

function setupMonthFilterOptions() {
    const monthsList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();
    reportMonthFilter.innerHTML = '';
    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
        for (let m = 0; m < 12; m++) {
            const optionValue = `${monthsList[m]}-${y.toString().slice(-2)}`;
            const option = document.createElement('option');
            option.value = optionValue;
            option.innerText = `${monthsList[m]} 20${y.toString().slice(-2)}`;
            reportMonthFilter.appendChild(option);
        }
    }
    const today = new Date().toISOString().split('T')[0];
    reportMonthFilter.value = getSalaryMonthGroup(today);
}

saveProfileBtn.onclick = function() {
    const name = staffNameInput.value.trim().toUpperCase();
    const card = cardNoInput.value.trim();
    const mobile = userMobileInput.value.trim();
    
    if (!name || !card || !mobile || mobile.length < 10) { 
        alert("Kripya Name, Card aur 10 Digits ka Mobile Number bharein!"); 
        return; 
    }
    
    localStorage.setItem('staffName', name);
    localStorage.setItem('cardNo', card);
    localStorage.setItem('userMobile', mobile);
    
    database.ref('users/' + mobile).once('value', (snapshot) => {
        if (snapshot.exists()) {
            syncDataFromCloud(mobile);
        } else {
            database.ref('users/' + mobile).set({ name: name, card: card });
            localStorage.setItem('allEntries', JSON.stringify([]));
            updateTable();
        }
        showMainApp(name, card);
    });
};

saveEntryBtn.addEventListener('click', () => {
    const activity = activityInput.value;
    const size = itemSizeInput.value.trim();
    const qty = parseFloat(quantityInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const rawDate = entryDateInput.value;
    const mobile = localStorage.getItem('userMobile');

    if (!size || qty <= 0 || rate < 0 || !rawDate) { alert("Sabhi fields bharna jaruri hai!"); return; }

    const totalRate = parseFloat((qty * rate).toFixed(2));
    const salaryMonth = getSalaryMonthGroup(rawDate);

    const newEntryRef = database.ref('users/' + mobile + '/entries').push();
    const entryId = newEntryRef.key;

    const newEntry = {
        id: entryId,
        rawDate: rawDate, 
        date: formatDateDisplay(rawDate),
        salaryMonth: salaryMonth,
        activity: activity,
        size: size,
        qty: qty,
        rate: rate,
        total: totalRate
    };

    newEntryRef.set(newEntry);

    let allEntries = JSON.parse(localStorage.getItem('allEntries')) || [];
    allEntries.push(newEntry);
    localStorage.setItem('allEntries', JSON.stringify(allEntries));

    itemSizeInput.value = ''; quantityInput.value = ''; rateInput.value = '';
    alert("Entry Save Ho Gayi!");
    updateTable();
});

window.deleteEntry = function(entryId) {
    if (confirm("Kya aap sach me is entry ko delete karna chahte hain?")) {
        const mobile = localStorage.getItem('userMobile');
        database.ref('users/' + mobile + '/entries/' + entryId).remove();

        let allEntries = JSON.parse(localStorage.getItem('allEntries')) || [];
        let updatedEntries = allEntries.filter(item => item.id !== entryId);
        localStorage.setItem('allEntries', JSON.stringify(updatedEntries));

        alert("Entry successfully delete ho gayi!");
        updateTable();
    }
}

// Excel Download Trigger from Dropdown Menu
menuDownloadExcel.addEventListener('click', (e) => {
    e.preventDefault();
    let allEntries = JSON.parse(localStorage.getItem('allEntries')) || [];
    const selectedMonth = reportMonthFilter.value;
    const filteredEntries = allEntries.filter(item => item.salaryMonth === selectedMonth);

    if (filteredEntries.length === 0) { alert("Is mahine ka koi data nahi mila!"); return; }
    filteredEntries.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));

    const dailyReportData = [["तारीख", "कार्य विवरण", "आकार/माप", "स्टाफ का नाम", "मात्रा", "रेट ", "टोटल रेट "]];
    filteredEntries.forEach(item => {
        dailyReportData.push([item.date, item.activity, item.size, localStorage.getItem('staffName'), item.qty, item.rate, item.total]);
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dailyReportData), "Daly report");
    XLSX.writeFile(wb, `सिलाई_रिपोर्ट_${selectedMonth}_${localStorage.getItem('staffName')}.xlsx`);
    alert("Excel शीट डाउनलोड हो रही है!");
});

function showMainApp(name, card) {
    loginBlock.classList.add('hidden'); mainApp.classList.remove('hidden');
    headerStaff.innerText = `${name} (${card})`;
    updateTable();
}
function showLogin() { loginBlock.classList.remove('hidden'); mainApp.classList.add('hidden'); headerStaff.innerText = "सिलाई लॉग";}

function formatDateDisplay(dateString) {
    if(!dateString) return '';
    const parts = dateString.split('-');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parts[2]}-${months[parseInt(parts[1]) - 1]}`;
}

// Fixed to show only TODAY'S / SELECTED DATE'S data
function updateTable() {
    todayTableBody.innerHTML = '';
    let allEntries = JSON.parse(localStorage.getItem('allEntries')) || [];
    const selectedDate = entryDateInput.value; // Filter by currently selected date
    
    const filteredEntries = allEntries.filter(item => item.rawDate === selectedDate);
    
    let grandTotal = 0;
    filteredEntries.forEach(item => { grandTotal += item.total; });
    document.getElementById('grandTotalSalary').innerText = `₹${grandTotal.toFixed(2)}`;
    
    const displayList = [...filteredEntries].reverse();
    displayList.forEach(item => {
        let displayDate = item.date || "Data";
        
        const row = `<tr>
            <td>${displayDate}</td>
            <td>${item.size || 'N/A'}</td>
            <td>${item.qty || 0}</td>
            <td>${item.rate || 0}</td>
            <td style="font-weight: bold; color: #27ae60;">₹${item.total || 0}</td>
            <td><button onclick="deleteEntry('${item.id}')" style="background:#e74c3c; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">❌</button></td>
        </tr>`;
        todayTableBody.innerHTML += row;
    });
}
