import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Headset, Plus, Send, Store, Wrench } from "lucide-react";

import useAuth from "../../hooks/useAuth";
import { supabase } from "../../lib/supabase";
import Modal from "../common/modal";
import MessageService from "../../services/messageService";

function timeLabel(value) {
  const date = new Date(value);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function NewChatModal({ isOpen, onClose, onOpened, isAdmin }) {
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    MessageService.directory()
      .then(setPeople)
      .catch((err) => setError(err.message || "Could not load the list."));
  }, [isOpen]);

  const open = async (action) => {
    setBusy(true);
    setError("");
    try {
      onOpened(await action());
    } catch (err) {
      setError(err.message || "Could not start that chat.");
    } finally {
      setBusy(false);
    }
  };

  const shown = people.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New message">
      {error && <div className="form-error">{error}</div>}

      {!isAdmin && (
        <button type="button" className="chat-pick chat-pick--support" disabled={busy} onClick={() => open(() => MessageService.openSupport())}>
          <Headset size={20} />
          <span><strong>MAK MART Admin</strong><small>Ask the team for help</small></span>
        </button>
      )}

      <div className="form-group">
        <label htmlFor="chat-search">{isAdmin ? "Message a vendor or service provider" : "Or message another vendor / provider"}</label>
        <input id="chat-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" />
      </div>

      <ul className="chat-people">
        {shown.map((person) => (
          <li key={person.user_id}>
            <button type="button" className="chat-pick" disabled={busy} onClick={() => open(() => MessageService.openDirect(person.user_id))}>
              {person.kind === "Vendor" ? <Store size={20} /> : <Wrench size={20} />}
              <span><strong>{person.name}</strong><small>{person.kind}</small></span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="field-hint">No one to show yet.</li>}
      </ul>
    </Modal>
  );
}

function MessagesPanel() {
  const { user, isAdmin } = useAuth();
  const userId = user?.id;
  const [params, setParams] = useSearchParams();
  const activeId = params.get("c");

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);

  const loadList = useCallback(() => {
    MessageService.conversations()
      .then(setConversations)
      .catch((err) => setError(err.message || "Could not load your messages."))
      .finally(() => setLoaded(true));
  }, []);

  const loadThread = useCallback(
    async (id) => {
      try {
        setMessages(await MessageService.messages(id));
        await MessageService.markRead(id);
        window.dispatchEvent(new Event("mm:messages-read"));
        loadList();
      } catch (err) {
        setError(err.message || "Could not load this chat.");
      }
    },
    [loadList]
  );

  useEffect(() => {
    loadList();
    const timer = setInterval(loadList, 30_000);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!activeId || !userId) return undefined;

    loadThread(activeId);
    const timer = setInterval(() => loadThread(activeId), 20_000);
    const channel = supabase
      .channel(`chat:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        () => loadThread(activeId)
      )
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [activeId, userId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, activeId]);

  const select = (id) => setParams(id ? { c: id } : {});

  const send = async (event) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || !activeId || sending) return;

    setSending(true);
    setError("");
    try {
      await MessageService.send(activeId, text);
      setDraft("");
      await loadThread(activeId);
    } catch (err) {
      setError(err.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const active = conversations.find((c) => c.id === activeId);

  return (
    <section className="dashboard-page chat">
      <div className="page-header page-header--with-action">
        <div>
          <span className="eyebrow">MESSAGES</span>
          <h1>Messages</h1>
          <p>Chat with the MAK MART team and with other vendors and service providers.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => setNewOpen(true)}>
          <Plus size={18} /> New message
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className={`chat__layout ${activeId ? "is-open" : ""}`}>
        <aside className="chat__list" aria-label="Conversations">
          {!loaded ? (
            <p className="field-hint">Loading...</p>
          ) : conversations.length === 0 ? (
            <div className="empty-state">
              <h3>No messages yet</h3>
              <p>Tap “New message” to write to the admin team or another vendor.</p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chat__item ${c.id === activeId ? "is-active" : ""} ${c.unread ? "is-unread" : ""}`}
                onClick={() => select(c.id)}
              >
                <span className="chat__avatar">{c.kind === "support" && !isAdmin ? <Headset size={18} /> : (c.title || "?").charAt(0).toUpperCase()}</span>
                <span className="chat__meta">
                  <strong>{c.title}</strong>
                  <small>{c.subtitle}</small>
                  <em>{c.last_message_preview || "No messages yet"}</em>
                </span>
                <span className="chat__time">{timeLabel(c.last_message_at)}{c.unread && <i aria-label="Unread" />}</span>
              </button>
            ))
          )}
        </aside>

        <div className="chat__thread">
          {!activeId ? (
            <div className="chat__empty">Choose a conversation or start a new one.</div>
          ) : (
            <>
              <header className="chat__head">
                <button type="button" className="chat__back" onClick={() => select(null)} aria-label="Back to conversations">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <strong>{active?.title || "Chat"}</strong>
                  <small>{active?.subtitle}</small>
                </div>
              </header>

              <div className="chat__messages">
                {messages.length === 0 && <p className="field-hint">Say hello 👋</p>}
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`chat__bubble ${mine ? "is-mine" : ""}`}>
                      {!mine && m.sender_is_admin && <small className="chat__tag">MAK MART Admin</small>}
                      <p>{m.body}</p>
                      <small>{timeLabel(m.created_at)}</small>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form className="chat__composer" onSubmit={send}>
                <textarea
                  rows={1}
                  value={draft}
                  maxLength={2000}
                  placeholder="Type a message"
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send();
                    }
                  }}
                />
                <button type="submit" className="primary-button" disabled={sending || !draft.trim()} aria-label="Send">
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      <NewChatModal
        isOpen={newOpen}
        isAdmin={isAdmin}
        onClose={() => setNewOpen(false)}
        onOpened={(id) => {
          setNewOpen(false);
          loadList();
          select(id);
        }}
      />
    </section>
  );
}

export default MessagesPanel;