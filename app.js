// ======= DOM Elements =======
const btn = document.querySelector('.talk');
const manualInput = document.getElementById('manualInput');
const sendBtn = document.getElementById('send');
const chatbox = document.getElementById('chatbox');
const avatar = document.querySelector('.image-container img');
const personalitySelect = document.getElementById("personalitySelect");

// ======= Voice Settings =======
let availableVoices = [];
let selectedVoice = null;
let voiceSettings = { rate: 1, pitch: 1, volume: 1 };

function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
    if (!selectedVoice && availableVoices.length > 0) {
        selectedVoice =
            availableVoices.find(v => v.lang.includes("en")) ||
            availableVoices.find(v => /Google|Microsoft|Natural/i.test(v.name)) ||
            availableVoices[0];
    }
}
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

function speak(text) {
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate = voiceSettings.rate;
    utter.pitch = voiceSettings.pitch;
    utter.volume = voiceSettings.volume;
    utter.onstart = () => avatar.classList.add("speaking");
    utter.onend = () => avatar.classList.remove("speaking");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
}

// ======= Chat helper =======
let conversationHistory = [];
function remember(message, sender) {
    conversationHistory.push({ sender, message });
    if (conversationHistory.length > 5) conversationHistory.shift();
}

function addMessage(message, sender, typingEffect = false) {
    const msg = document.createElement("div");
    msg.classList.add("message", sender);
    chatbox.appendChild(msg);
    chatbox.scrollTop = chatbox.scrollHeight;
    remember(message, sender);

    if (typingEffect && sender === "jarvis") {
        msg.classList.add("typing");
        let i = 0;
        const interval = setInterval(() => {
            msg.textContent += message.charAt(i);
            i++;
            if (i >= message.length) {
                clearInterval(interval);
                msg.classList.remove("typing");
            }
        }, 40);
    } else {
        msg.textContent = message;
    }
}

// ======= Personality Modes =======
let personalityMode = "formal";
if (personalitySelect) {
    personalitySelect.addEventListener("change", () => {
        personalityMode = personalitySelect.value;
        setMood(personalityMode);
        addMessage(`Personality switched to ${personalityMode}.`, "jarvis", true);
        speak(`Personality switched to ${personalityMode}`);
    });
}

function setMood(mode) {
    if (mode === "formal") avatar.style.filter = "drop-shadow(0 0 15px blue)";
    else if (mode === "casual") avatar.style.filter = "drop-shadow(0 0 15px orange)";
    else if (mode === "funny") avatar.style.filter = "drop-shadow(0 0 15px green)";
}

// ======= Jokes / Chit-chat =======
const jokes = [
    "Why did the computer go to the doctor? Because it caught a virus! 😆",
    "Why did the programmer quit his job? Because he didn't get arrays! 😂",
    "Why did the developer go broke? Because he used up all his cache! 😜"
];

const chitChat = {
    "how are you": "I'm fine! How are you?",
    "what's up": "Just hanging out with you 😎",
    "who made you": "I was created by a developer, but I am your digital companion ❤️"
};

function naturalize(text) {
    const fillers = ["Hmm...", "Well...", "Listen...", "By the way..."];
    if (Math.random() > 0.6) {
        return fillers[Math.floor(Math.random() * fillers.length)] + " " + text;
    }
    return text;
}

// ======= Math Evaluation =======
function evaluateMath(query) {
    try {
        if (/[\d\+\-\*\/\^\(\)]/.test(query)) {
            return "Answer: " + eval(query);
        }
    } catch (e) { }
    return null;
}

// ======= Weather =======
async function fetchWeather(city) {
    try {
        const apiKey = "e732c9e1425f133956bd66268efe4ca0"; // 🔑 Replace with your OpenWeatherMap key
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`);
        const data = await res.json();
        if (data.cod !== 200) return `Sorry, I couldn't find weather for ${city}.`;
        return `Currently in ${data.name}, it is ${data.main.temp}°C with ${data.weather[0].description}.`;
    } catch {
        return "Weather info could not be retrieved!";
    }
}

// ======= DuckDuckGo API =======
async function fetchDuckDuckGo(query) {
    try {
        const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`);
        const data = await response.json();
        if (data.AbstractText) return data.AbstractText;
        if (data.RelatedTopics && data.RelatedTopics.length > 0) return data.RelatedTopics[0].Text;
        return null;
    } catch { return null; }
}

// ======= Wikipedia API =======
async function fetchWikipedia(query) {
    try {
        const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        if (response.status !== 200) return null;
        const data = await response.json();
        return data.extract || null;
    } catch { return null; }
}

// ======= Personality & Replies =======
function generateReply(message) {
    message = message.toLowerCase();

    if (message.includes("joke")) return jokes[Math.floor(Math.random() * jokes.length)];

    for (const key in chitChat) if (message.includes(key)) return chitChat[key];

    let reply = "";
    if (personalityMode === "formal") {
        if (message.includes("hello") || message.includes("hey")) reply = "Good day! How may I assist you?";
        else if (message.includes("time")) reply = `The current time is ${new Date().toLocaleTimeString()}.`;
        else if (message.includes("date")) reply = `Today's date is ${new Date().toLocaleDateString()}.`;
    }
    if (personalityMode === "casual") {
        if (message.includes("hello") || message.includes("hey")) reply = "Hey buddy! What's up?";
        else if (message.includes("time")) reply = `Right now it's ${new Date().toLocaleTimeString()}.`;
        else if (message.includes("date")) reply = `Today's date is ${new Date().toLocaleDateString()}.`;
    }
    if (personalityMode === "funny") {
        reply = "Haha! You got me there 😎";
    }

    return reply || null;
}

// ======= Take Command =======
async function takeCommand(message) {
    if (!message) return;
    addMessage(message, "user");

    if (!navigator.onLine) {
        const offline = evaluateMath(message) || generateReply(message) || "I'm offline! Ask me a joke or math problem.";
        addMessage(offline, "jarvis", true);
        speak(naturalize(offline));
        return;
    }

    const personalityReply = generateReply(message);
    if (personalityReply) {
        addMessage(personalityReply, "jarvis", true);
        speak(naturalize(personalityReply));
        return;
    }

    // ======= Weather Handling =======
    if (message.includes("weather")) {
        let city = "Nagpur"; // default
        const match = message.match(/weather in ([a-zA-Z\s]+)/i);
        if (match && match[1]) {
            city = match[1].trim();
        }
        const weather = await fetchWeather(city);
        addMessage(weather, "jarvis", true);
        speak(naturalize(weather));
        return;
    }

    if (message.includes("play") && message.includes("song")) {
        const query = message.replace("play", "").replace("song", "");
        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank");
        const resp = "I searched YouTube for your song!";
        addMessage(resp, "jarvis", true);
        speak(naturalize(resp));
        return;
    }

    const mathAnswer = evaluateMath(message);
    if (mathAnswer) {
        addMessage(mathAnswer, "jarvis", true);
        speak(naturalize(mathAnswer));
        return;
    }

    const ddgAnswer = await fetchDuckDuckGo(message);
    if (ddgAnswer) {
        addMessage(ddgAnswer, "jarvis", true);
        speak(naturalize(ddgAnswer));
        return;
    }

    const wikiAnswer = await fetchWikipedia(message);
    if (wikiAnswer) {
        addMessage(wikiAnswer, "jarvis", true);
        speak(naturalize(wikiAnswer));
        return;
    }

    const link = `https://www.google.com/search?q=${encodeURIComponent(message)}`;
    const fallback = `I couldn't find an exact answer. Searching Google for "${message}"`;
    addMessage(fallback, "jarvis", true);
    speak(naturalize(fallback));
    window.open(link, "_blank");
}

// ======= Voice Controls =======
function setupVoiceControls() {
    const voiceSelect = document.getElementById("voiceSelect");
    if (!voiceSelect) return;
    function populateVoiceList() {
        loadVoices();
        voiceSelect.innerHTML = "";
        availableVoices.forEach((v, i) => {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `${v.name} (${v.lang})`;
            if (v === selectedVoice) option.selected = true;
            voiceSelect.appendChild(option);
        });
    }
    populateVoiceList();
    window.speechSynthesis.onvoiceschanged = populateVoiceList;
    voiceSelect.addEventListener("change", () => { selectedVoice = availableVoices[voiceSelect.value]; });
    ["rate", "pitch", "volume"].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.addEventListener("input", () => voiceSettings[s] = parseFloat(el.value));
    });
}
document.addEventListener("DOMContentLoaded", setupVoiceControls);

// ======= Mic & Speech Recognition =======
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => { btn.classList.add("listening"); startBeep.play(); };
    recognition.onend = () => { btn.classList.remove("listening"); endBeep.play(); };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        takeCommand(transcript);
    };
    btn.addEventListener('click', () => recognition.start());
} else {
    addMessage("Speech Recognition not supported. Type instead.", "jarvis", true);
}

// ======= Manual Input =======
sendBtn.addEventListener('click', () => {
    const text = manualInput.value.trim();
    if (!text) return;
    manualInput.value = "";
    takeCommand(text);
});
manualInput.addEventListener('keypress', (e) => { if (e.key === "Enter") sendBtn.click(); });

// ======= Beeps =======
const startBeep = new Audio("start-beep.mp3");
const endBeep = new Audio("end-beep.mp3");

// ======= Initialization =======
(async function init() {
    addMessage("Initializing JARVIS...", "jarvis");
    speak("Initializing JARVIS");
    setTimeout(() => addMessage("Hello! Type or speak anything. I can provide answers, calculations, jokes, and weather info.", "jarvis"), 900);
})();
