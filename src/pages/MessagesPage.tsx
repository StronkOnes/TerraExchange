import React, {useCallback, useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {Send, Paperclip, ExternalLink} from 'lucide-react';
import type {BusinessAccount, ConversationThread} from '../types/terraexchange';
import {useAuth} from '../context/AuthContext';

export function MessagesPage() {
  const {apiFetch, user} = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [businesses, setBusinesses] = useState<BusinessAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [replyBody, setReplyBody] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  // New Thread Compose State (triggered via ?toBusinessId=...)
  const toBusinessIdParam = searchParams.get('toBusinessId') || '';
  const listingIdParam = searchParams.get('listingId') || '';
  const rfqIdParam = searchParams.get('rfqId') || '';
  const [composeToId, setComposeToId] = useState(toBusinessIdParam);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCompose, setShowCompose] = useState(Boolean(toBusinessIdParam));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadThreads = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [msgRes, bizRes] = await Promise.all([
        apiFetch<{conversations: ConversationThread[]}>('/messages'),
        apiFetch<{businesses: BusinessAccount[]}>('/businesses'),
      ]);
      setThreads(msgRes.conversations);
      setBusinesses(bizRes.businesses);
      if (msgRes.conversations.length > 0 && !activeId) {
        setActiveId(msgRes.conversations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load conversations.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, user, activeId]);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (toBusinessIdParam) {
      setComposeToId(toBusinessIdParam);
      setShowCompose(true);
    }
  }, [toBusinessIdParam]);

  const activeThread = threads.find((t) => t.id === activeId) || null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !replyBody.trim()) return;
    setError(null);
    try {
      const res = await apiFetch<{conversation: ConversationThread}>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: activeThread.id,
          body: replyBody,
          attachmentName: attachmentName || undefined,
        }),
      });
      setThreads((prev) =>
        prev.map((t) => (t.id === res.conversation.id ? res.conversation : t))
      );
      setReplyBody('');
      setAttachmentName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message.');
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch<{conversation: ConversationThread}>('/messages', {
        method: 'POST',
        body: JSON.stringify({
          toBusinessId: composeToId,
          subject: composeSubject || undefined,
          body: composeBody,
          linkedListingId: listingIdParam || undefined,
          linkedRfqId: rfqIdParam || undefined,
        }),
      });
      setThreads((prev) => [res.conversation, ...prev]);
      setActiveId(res.conversation.id);
      setShowCompose(false);
      setComposeSubject('');
      setComposeBody('');
      setSearchParams({});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start conversation.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-12">
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-xl mx-auto">
          <h1 className="font-display text-2xl font-bold text-slate-900 mb-2">
            B2B Negotiation &amp; Messaging
          </h1>
          <p className="text-sm text-slate-600 mb-6">
            Commercial conversations linked to RFQs and listings are private to participating
            businesses. Sign in to access your threads.
          </p>
          <Link
            to="/auth"
            className="inline-block px-5 py-2.5 text-xs font-semibold bg-slate-900 text-white rounded-md"
          >
            Sign In / Use Demo Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-200 mb-8">
        <div>
          <p className="text-xs font-medium text-amber-700 mb-1">
            Commercial Communications
          </p>
          <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            B2B Messaging &amp; Negotiations
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCompose((v) => !v)}
          className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 whitespace-nowrap self-start sm:self-auto"
        >
          {showCompose ? 'Close New Message' : 'New Commercial Thread'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg p-4 mb-6">
          {error}
        </div>
      )}

      {showCompose && (
        <form
          onSubmit={handleCreateThread}
          className="bg-white border border-slate-200 rounded-lg p-6 mb-8 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-slate-900">
            Start New Business Conversation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Recipient Business
              </label>
              <select
                value={composeToId}
                onChange={(e) => setComposeToId(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              >
                <option value="">Select verified counterparty...</option>
                {businesses
                  .filter((b) => b.id !== user.businessId)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.country})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject (Optional if linked to RFQ/Listing)
              </label>
              <input
                type="text"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="e.g. Laycan confirmation & SGS sampling"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
            <textarea
              rows={3}
              required
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              placeholder="Write your commercial enquiry or technical clarification..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCompose(false)}
              className="px-4 py-2 text-xs font-medium border border-slate-300 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-amber-600 text-white rounded-md"
            >
              Send Enquiry
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Thread List */}
        <div className="lg:col-span-4 space-y-2">
          {loading ? (
            <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
          ) : threads.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-xs text-slate-600">
              No conversations yet. Start an enquiry from any listing, RFQ, or directory profile.
            </div>
          ) : (
            threads.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={`w-full text-left p-4 rounded-lg border transition-colors ${
                  activeId === t.id
                    ? 'bg-white border-slate-900 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <p className="font-display text-sm font-semibold text-slate-900 line-clamp-1 mb-1">
                  {t.subject}
                </p>
                <p className="text-xs text-slate-600 line-clamp-1 mb-1.5">
                  {t.participantBusinessNames.join(' ↔ ')}
                </p>
                <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono tabular-nums">
                  <span>{t.messages.length} messages</span>
                  <span>{new Date(t.updatedAt).toLocaleDateString()}</span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Active Conversation Pane */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg flex flex-col min-h-[460px]">
          {!activeThread ? (
            <div className="p-10 text-center text-sm text-slate-500 m-auto">
              Select a conversation thread to view messages and linked commercial records.
            </div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-slate-900">
                    {activeThread.subject}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeThread.participantBusinessNames.join(' · ')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {activeThread.linkedListingId && (
                    <Link
                      to={`/listings/${activeThread.linkedListingId}`}
                      className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline"
                    >
                      <span>Linked Listing</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {activeThread.linkedRfqId && (
                    <Link
                      to="/rfqs"
                      className="inline-flex items-center gap-1 font-medium text-slate-700 hover:underline"
                    >
                      <span>{activeThread.linkedRfqCode || 'Linked RFQ'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              <div className="flex-1 p-5 space-y-4 overflow-y-auto max-h-[420px]">
                {activeThread.messages.map((m) => {
                  const isMine = m.senderBusinessId === user.businessId;
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-lg border text-sm ${
                        isMine
                          ? 'bg-slate-900 text-white border-slate-900 ml-8'
                          : 'bg-slate-50 text-slate-900 border-slate-200 mr-8'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5 opacity-80">
                        <span className="font-semibold">
                          {m.senderName} · {m.senderBusinessName}
                        </span>
                        <span className="font-mono tabular-nums">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="leading-relaxed">{m.body}</p>
                      {m.attachmentName && (
                        <div className="mt-2 pt-2 border-t border-current/15 text-xs inline-flex items-center gap-1.5 opacity-90">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="font-mono">{m.attachmentName}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <form
                onSubmit={handleSendReply}
                className="p-4 border-t border-slate-200 bg-slate-50 space-y-3"
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write a message or counter-offer note..."
                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-slate-400"
                  />
                  <input
                    type="text"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    placeholder="Attach doc ref (optional)"
                    className="sm:w-52 px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md"
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-md whitespace-nowrap"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
