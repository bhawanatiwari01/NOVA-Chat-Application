import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  MessageCircle,
  Phone,
  Video,
  Search,
  Users,
  UserPlus,
  LogOut,
  ArrowLeft,
  Check,
  X,
  Sparkles,
} from "lucide-react";
import { api, MOCK } from "../api";
import "./Chat.css";

/* ---------- helpers ---------- */

const PALETTE = [
  { g: "linear-gradient(135deg,#ff6b9d,#ff9a5a)", c: "#e8467f" },
  { g: "linear-gradient(135deg,#6c5ce7,#a58bff)", c: "#6c5ce7" },
  { g: "linear-gradient(135deg,#00b894,#00cec9)", c: "#00997a" },
  { g: "linear-gradient(135deg,#0984e3,#4db8ff)", c: "#0b78d0" },
  { g: "linear-gradient(135deg,#e17055,#fdb94e)", c: "#d35a3d" },
  { g: "linear-gradient(135deg,#e84393,#c56cf0)", c: "#c2338a" },
];
const pick = (id) =>
  PALETTE[[...String(id)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
const initials = (n = "") =>
  n.replace(/[^\p{L}\s]/gu, "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// conversation ko list mein sabse upar le aao + patch lagao
function bump(list, id, patch) {
  const c = list.find((x) => x.id === id);
  if (!c) return list;
  const p = typeof patch === "function" ? patch(c) : patch;
  return [{ ...c, ...p }, ...list.filter((x) => x.id !== id)];
}

const REPLIES = [
  "Haha, sahi hai! 😄",
  "Okay, done 👍",
  "Wow, nice! ✨",
  "Kal baat karte hain",
  "Mast idea hai 🔥",
  "Haan bilkul!",
];

/* ---------- small components ---------- */

function Avatar({ id, name, group, online, size = 46 }) {
  return (
    <div
      className="nv-avatar"
      style={{ background: pick(id).g, width: size, height: size, fontSize: size * 0.38 }}
    >
      {group ? <Users size={size * 0.46} /> : initials(name)}
      {online && <span className="nv-online" />}
    </div>
  );
}

function SkeletonList() {
  return (
    <ul className="nv-list" aria-label="Loading">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="nv-skel">
          <span className="nv-skel-circle" />
          <span className="nv-skel-lines">
            <i style={{ width: "55%" }} />
            <i style={{ width: "80%" }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function GroupModal({ users, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [sel, setSel] = useState([]);
  const [busy, setBusy] = useState(false);
  const toggle = (id) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const ok = name.trim().length >= 2 && sel.length >= 2;

  async function submit(e) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    await onCreate({ name: name.trim(), memberIds: sel });
    setBusy(false);
  }

  return (
    <motion.div
      className="nv-modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className="nv-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        <div className="nv-modal-head">
          <h3>New group</h3>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <input
          className="nv-modal-input"
          placeholder="Group name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <p className="nv-modal-label">
          Add members <span>{sel.length} selected</span>
        </p>
        <div className="nv-chips">
          {users.map((u) => {
            const on = sel.includes(u.id);
            return (
              <button
                type="button"
                key={u.id}
                className={`nv-chip ${on ? "on" : ""}`}
                onClick={() => toggle(u.id)}
              >
                <Avatar id={u.id} name={u.name} size={28} />
                {u.name.split(" ")[0]}
                {on && <Check size={14} strokeWidth={3} />}
              </button>
            );
          })}
        </div>

        <button className="nv-modal-submit" type="submit" disabled={!ok || busy}>
          {busy ? "Creating..." : "Create group"}
        </button>
        {!ok && <small className="nv-hint">Group name aur kam se kam 2 members chahiye.</small>}
      </motion.form>
    </motion.div>
  );
}

/* ---------- main ---------- */

export default function Chat({ user, onLogout }) {
  const myId = user?.id ?? "me";

  const [tab, setTab] = useState("chats"); // "chats" | "people"
  const [convs, setConvs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [msgs, setMsgs] = useState({});
  const [msgLoading, setMsgLoading] = useState(false);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [typingIn, setTypingIn] = useState(null);
  const [mobileChat, setMobileChat] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);

  const endRef = useRef(null);
  const activeRef = useRef(null);
  activeRef.current = activeId;

  const active = convs.find((c) => c.id === activeId);
  const messages = msgs[activeId] || [];

  /* login ke baad: registered users + conversations (direct & group) load karo,
     aur pehli conversation default open kar do */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, u] = await Promise.all([api.getConversations(), api.getUsers()]);
        if (!alive) return;
        setConvs(c.map((x, i) => (i === 0 ? { ...x, unread: 0 } : x)));
        setUsers(u);
        if (c.length) setActiveId(c[0].id);
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* conversation kholte hi uske messages laao */
  useEffect(() => {
    if (!activeId || msgs[activeId]) return;
    let alive = true;
    setMsgLoading(true);
    api
      .getMessages(activeId)
      .then((m) => alive && setMsgs((o) => ({ ...o, [activeId]: m })))
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setMsgLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingIn, activeId]);

  function openConv(id) {
    setActiveId(id);
    setMobileChat(true);
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  function simulateReply(conv) {
    setTimeout(() => setTypingIn(conv.id), 500);
    setTimeout(() => {
      setTypingIn(null);
      const from = conv.members[Math.floor(Math.random() * conv.members.length)];
      const m = {
        id: "r" + Date.now(),
        text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
        senderId: from.id,
        senderName: from.name,
        time: nowTime(),
      };
      setMsgs((o) => ({ ...o, [conv.id]: [...(o[conv.id] || []), m] }));
      setConvs((cs) =>
        bump(cs, conv.id, (c) => ({
          last: { text: m.text, time: m.time, sender: from.name },
          unread: activeRef.current === conv.id ? 0 : (c.unread || 0) + 1,
        }))
      );
    }, 2200);
  }

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || !active) return;
    const conv = active;
    const temp = { id: "t" + Date.now(), text, senderId: myId, senderName: "You", time: nowTime() };

    setMsgs((o) => ({ ...o, [conv.id]: [...(o[conv.id] || []), temp] }));
    setConvs((cs) => bump(cs, conv.id, { last: { text, time: temp.time, sender: "You" } }));
    setInput("");

    try {
      await api.sendMessage(conv.id, text);
    } catch {
      setMsgs((o) => ({
        ...o,
        [conv.id]: o[conv.id].map((m) => (m.id === temp.id ? { ...m, failed: true } : m)),
      }));
      return;
    }
    if (MOCK) simulateReply(conv);
  }

  async function startChat(u) {
    const existing = convs.find((c) => c.type === "direct" && c.members[0]?.id === u.id);
    if (existing) {
      openConv(existing.id);
      setTab("chats");
      return;
    }
    try {
      const c = await api.createConversation({ type: "direct", userId: u.id });
      setConvs((cs) => [c, ...cs]);
      setMsgs((o) => ({ ...o, [c.id]: [] }));
      setTab("chats");
      openConv(c.id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function createGroup(payload) {
    try {
      const c = await api.createConversation({ type: "group", ...payload });
      setConvs((cs) => [c, ...cs]);
      setMsgs((o) => ({ ...o, [c.id]: [] }));
      setGroupOpen(false);
      setTab("chats");
      openConv(c.id);
    } catch (e) {
      setError(e.message);
    }
  }

  const q = search.trim().toLowerCase();
  const shownConvs = convs.filter((c) => c.name.toLowerCase().includes(q));
  const shownUsers = users.filter((u) => u.name.toLowerCase().includes(q));
  const myName = user?.name || "You";

  return (
    <main className="nv-page">
      <div className={`nv-shell ${mobileChat ? "show-chat" : ""}`}>
        {/* ================= sidebar ================= */}
        <aside className="nv-side">
          <div className="nv-top">
            <div className="nv-brand">
              <span className="nv-brand-icon"><MessageCircle size={22} /></span>
              Nova<span className="nv-brand-dot">.</span>
            </div>
            <button className="nv-icon-btn" onClick={onLogout} aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </div>

          <div className="nv-me">
            <Avatar id={myName} name={myName} online size={46} />
            <div>
              <strong>{myName}</strong>
              <small>{user?.email || "My account"}</small>
            </div>
          </div>

          <div className="nv-tabs" role="tablist">
            {[
              { key: "chats", label: "Chats", count: convs.length },
              { key: "people", label: "People", count: users.length },
            ].map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? "on" : ""}
                onClick={() => setTab(t.key)}
              >
                {tab === t.key && (
                  <motion.span
                    layoutId="nv-tab"
                    className="nv-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="nv-tab-text">
                  {t.label} <em>{t.count}</em>
                </span>
              </button>
            ))}
          </div>

          <label className="nv-search">
            <Search size={17} />
            <input
              placeholder={tab === "chats" ? "Search chats..." : "Search people..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>

          {error && (
            <div className="nv-error" role="alert">
              <span>{error}</span>
              <button onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button>
            </div>
          )}

          {loading ? (
            <SkeletonList />
          ) : tab === "chats" ? (
            <ul className="nv-list">
              {shownConvs.map((c, i) => {
                const on = c.id === activeId;
                return (
                  <motion.li
                    key={c.id}
                    initial={{ opacity: 0, x: -18 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.05 }}
                  >
                    <button className={`nv-item ${on ? "on" : ""}`} onClick={() => openConv(c.id)}>
                      {on && (
                        <motion.span
                          layoutId="nv-on"
                          className="nv-on-bg"
                          transition={{ type: "spring", stiffness: 400, damping: 34 }}
                        />
                      )}
                      <Avatar id={c.id} name={c.name} group={c.type === "group"} online={c.type === "direct" && c.online} />
                      <div className="nv-item-text">
                        <div className="nv-item-top">
                          <strong>{c.name}</strong>
                          <time>{c.last?.time}</time>
                        </div>
                        <div className="nv-item-bot">
                          <small>
                            {c.type === "group" && c.last?.sender ? `${c.last.sender.split(" ")[0]}: ` : ""}
                            {c.last?.text || "Say hi 👋"}
                          </small>
                          {c.unread > 0 && (
                            <motion.span
                              key={c.unread}
                              className="nv-badge"
                              initial={{ scale: 0.4 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 18 }}
                            >
                              {c.unread}
                            </motion.span>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
              {!shownConvs.length && (
                <li className="nv-empty">
                  {q ? "Koi chat nahi mili." : "Abhi koi chat nahi hai. People tab se kisi ko message karo."}
                </li>
              )}
            </ul>
          ) : (
            <ul className="nv-list">
              {shownUsers.map((u, i) => (
                <motion.li
                  key={u.id}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.05 }}
                >
                  <button className="nv-item" onClick={() => startChat(u)}>
                    <Avatar id={u.id} name={u.name} online={u.online} />
                    <div className="nv-item-text">
                      <div className="nv-item-top"><strong>{u.name}</strong></div>
                      <div className="nv-item-bot"><small>{u.online ? "Online now" : u.email}</small></div>
                    </div>
                    <span className="nv-msg-btn"><MessageCircle size={15} /> Message</span>
                  </button>
                </motion.li>
              ))}
              {!shownUsers.length && <li className="nv-empty">Koi user nahi mila.</li>}
            </ul>
          )}

          <button className="nv-new-group" onClick={() => setGroupOpen(true)} disabled={loading}>
            <UserPlus size={18} /> New group
          </button>
        </aside>

        {/* ================= chat area ================= */}
        <section className="nv-chat">
          {!active ? (
            <div className="nv-welcome">
              <motion.div
                className="nv-welcome-icon"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14 }}
              >
                <Sparkles size={38} />
              </motion.div>
              <h2>{loading ? "Loading your chats..." : `Hi ${myName.split(" ")[0]}, welcome to Nova`}</h2>
              <p>{loading ? "Ek second..." : "Left se koi chat chuno ya People tab se naya message shuru karo."}</p>
            </div>
          ) : (
            <>
              <header className="nv-head">
                <button className="nv-back" onClick={() => setMobileChat(false)} aria-label="Back">
                  <ArrowLeft size={20} />
                </button>
                <Avatar id={active.id} name={active.name} group={active.type === "group"} online={active.type === "direct" && active.online} />
                <div className="nv-head-info">
                  <strong>{active.name}</strong>
                  <small className={active.type === "direct" && active.online ? "live" : ""}>
                    {active.type === "group"
                      ? `You, ${active.members.map((m) => m.name.split(" ")[0]).join(", ")}`
                      : active.online ? "Online" : "Offline"}
                  </small>
                </div>
                <div className="nv-head-actions">
                  <button aria-label="Voice call"><Phone size={19} /></button>
                  <button aria-label="Video call"><Video size={20} /></button>
                </div>
              </header>

              <div className="nv-messages">
                <div className="nv-day"><span>Today</span></div>

                {msgLoading && !messages.length && <p className="nv-loading-msgs">Messages load ho rahe hain...</p>}

                {messages.map((m, i) => {
                  const mine = m.senderId === myId;
                  const showName = active.type === "group" && !mine && messages[i - 1]?.senderId !== m.senderId;
                  return (
                    <motion.div
                      key={m.id}
                      className={`nv-line ${mine ? "out" : ""}`}
                      initial={{ opacity: 0, y: 14, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22 }}
                    >
                      <div className={`nv-bubble ${m.failed ? "failed" : ""}`}>
                        {showName && <b style={{ color: pick(m.senderId).c }}>{m.senderName}</b>}
                        <p>{m.text}</p>
                        <time>
                          {m.failed ? "Not sent" : m.time} {mine && !m.failed ? "✓✓" : ""}
                        </time>
                      </div>
                    </motion.div>
                  );
                })}

                <AnimatePresence>
                  {typingIn === active.id && (
                    <motion.div
                      className="nv-line"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="nv-bubble nv-typing" aria-label="Typing">
                        <i /><i /><i />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div ref={endRef} />
              </div>

              <form className="nv-form" onSubmit={sendMessage}>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${active.name}...`}
                  aria-label="Write a message"
                />
                <button type="submit" disabled={!input.trim()} aria-label="Send">
                  <Send size={19} />
                </button>
              </form>
            </>
          )}
        </section>
      </div>

      <AnimatePresence>
        {groupOpen && (
          <GroupModal users={users} onClose={() => setGroupOpen(false)} onCreate={createGroup} />
        )}
      </AnimatePresence>
    </main>
  );
}
