/*
  NOVA API layer
  ----------------
  Abhi MOCK = true hai, to fake data se app chalega (backend ki zaroorat nahi).
  Jab tumhari API ready ho jaye: MOCK = false kar do aur BASE_URL set karo.

  Backend se ye endpoints expect kiye gaye hain (token header: Authorization: Bearer <token>):

  POST /auth/register                body { name, email, password } -> { token, user: { id, name, email } }
  POST /auth/login                   body { email, password }       -> { token, user: { id, name, email } }
  (galat password par status 400/401 ke saath { message: "..." } bhejo, wahi form mein dikhega)

  GET  /conversations                -> [{ id, type: "direct" | "group", name,
                                           members: [{ id, name }],      // khud ko chhod kar baaki members
                                           online: true/false,            // sirf direct ke liye
                                           unread: 0,
                                           last: { text, time, sender } }]
  GET  /users                        -> [{ id, name, email, online }]     // registered users (khud ko chhod kar)
  GET  /conversations/:id/messages   -> [{ id, text, senderId, senderName, time }]
  POST /conversations/:id/messages   body { text }          -> saved message
  POST /conversations                body { type: "direct", userId }
                                     ya   { type: "group", name, memberIds: [] }  -> naya conversation (upar wali shape)
*/

export const MOCK = false;
const BASE_URL = "http://localhost:5000/api";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options = {}) {
  const token = localStorage.getItem("nova_token");
  const res = await fetch(BASE_URL + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401 && token && !path.startsWith("/auth")) {
    // token expire ho gaya: logout karke login page par bhejo
    localStorage.removeItem("nova_token");
    localStorage.removeItem("nova_user");
    window.location.reload();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Something went wrong. Please try again.");
  }
  return res.json();
}

/* ---------------- mock data ---------------- */

const mockUsers = [
  { id: "u1", name: "Priya Sharma", email: "priya@nova.app", online: true },
  { id: "u2", name: "Rahul Verma", email: "rahul@nova.app", online: true },
  { id: "u3", name: "Ananya Singh", email: "ananya@nova.app", online: false },
  { id: "u4", name: "Aman Gupta", email: "aman@nova.app", online: true },
  { id: "u5", name: "Neha Kapoor", email: "neha@nova.app", online: false },
  { id: "u6", name: "Karan Mehta", email: "karan@nova.app", online: true },
];
const mini = (id) => ({ id, name: mockUsers.find((u) => u.id === id).name });

let mockConvs = [
  { id: "c1", type: "direct", name: "Priya Sharma", members: [mini("u1")], online: true, unread: 2,
    last: { text: "Kal milte hain? 😄", time: "11:42 AM", sender: "Priya Sharma" } },
  { id: "c2", type: "group", name: "Weekend Trip 🏖️", members: [mini("u1"), mini("u2"), mini("u4")], unread: 5,
    last: { text: "Tickets book ho gaye! 🎉", time: "11:10 AM", sender: "Rahul Verma" } },
  { id: "c3", type: "direct", name: "Rahul Verma", members: [mini("u2")], online: true, unread: 0,
    last: { text: "See you soon!", time: "09:45 AM", sender: "Rahul Verma" } },
  { id: "c4", type: "group", name: "College Friends 🎓", members: [mini("u3"), mini("u5"), mini("u6")], unread: 0,
    last: { text: "Reunion kab rakhein?", time: "Yesterday", sender: "Karan Mehta" } },
  { id: "c5", type: "direct", name: "Ananya Singh", members: [mini("u3")], online: false, unread: 0,
    last: { text: "Thank you 😊", time: "Yesterday", sender: "Ananya Singh" } },
];

const mockMessages = {
  c1: [
    { id: "m1", text: "Hey! 👋", senderId: "u1", senderName: "Priya Sharma", time: "11:30 AM" },
    { id: "m2", text: "Hi Priya! Kaisi ho?", senderId: "me", senderName: "You", time: "11:31 AM" },
    { id: "m3", text: "Mast! Kal milte hain? 😄", senderId: "u1", senderName: "Priya Sharma", time: "11:42 AM" },
  ],
  c2: [
    { id: "m4", text: "Guys, Goa plan final?", senderId: "u4", senderName: "Aman Gupta", time: "10:50 AM" },
    { id: "m5", text: "Haan bilkul, main ready hu 🔥", senderId: "me", senderName: "You", time: "10:55 AM" },
    { id: "m6", text: "Tickets book ho gaye! 🎉", senderId: "u2", senderName: "Rahul Verma", time: "11:10 AM" },
  ],
  c3: [{ id: "m7", text: "See you soon!", senderId: "u2", senderName: "Rahul Verma", time: "09:45 AM" }],
  c4: [{ id: "m8", text: "Reunion kab rakhein?", senderId: "u6", senderName: "Karan Mehta", time: "Yesterday" }],
  c5: [{ id: "m9", text: "Thank you 😊", senderId: "u3", senderName: "Ananya Singh", time: "Yesterday" }],
};

const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ---------------- public API ---------------- */

export const api = {
  async login({ email, password }) {
    if (MOCK) {
      await wait(1000);
      return { token: "mock-token", user: { id: "me", name: email.split("@")[0], email } };
    }
    return request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },

  async register({ name, email, password }) {
    if (MOCK) {
      await wait(1000);
      return { token: "mock-token", user: { id: "me", name, email } };
    }
    return request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
  },

  async getConversations() {
    if (MOCK) { await wait(900); return structuredClone(mockConvs); }
    return request("/conversations");
  },

  async getUsers() {
    if (MOCK) { await wait(700); return structuredClone(mockUsers); }
    return request("/users");
  },

  async getMessages(conversationId) {
    if (MOCK) { await wait(450); return structuredClone(mockMessages[conversationId] || []); }
    return request(`/conversations/${conversationId}/messages`);
  },

  async sendMessage(conversationId, text) {
    if (MOCK) {
      await wait(150);
      const msg = { id: "m" + Date.now(), text, senderId: "me", senderName: "You", time: nowTime() };
      (mockMessages[conversationId] ||= []).push(msg);
      return msg;
    }
    return request(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  async createConversation(payload) {
    if (MOCK) {
      await wait(500);
      let conv;
      if (payload.type === "direct") {
        const u = mockUsers.find((x) => x.id === payload.userId);
        conv = { id: "c" + Date.now(), type: "direct", name: u.name, members: [mini(u.id)], online: u.online, unread: 0, last: null };
      } else {
        conv = { id: "c" + Date.now(), type: "group", name: payload.name, members: payload.memberIds.map(mini), unread: 0, last: null };
      }
      mockConvs = [conv, ...mockConvs];
      mockMessages[conv.id] = [];
      return structuredClone(conv);
    }
    return request("/conversations", { method: "POST", body: JSON.stringify(payload) });
  },
};