import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { UserPlus, X } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import { Input, Select } from "../ui/Input";
import { useAuth } from "../../context/AuthContext";
import { boardApi } from "../../lib/api";
import { cn } from "../../lib/utils";

const ROLE_STYLES = {
  owner: "bg-brand-50 text-brand-700",
  editor: "bg-surface-2 text-ink",
  viewer: "bg-surface-2 text-muted",
};

export default function ShareModal({ open, onClose, boardId, members = [], setMembers, ownerId }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [busy, setBusy] = useState(null); // "invite" | userId being removed

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => {
        const ao = a.id === ownerId || a.role === "owner";
        const bo = b.id === ownerId || b.role === "owner";
        return ao === bo ? (a.name || a.email).localeCompare(b.name || b.email) : ao ? -1 : 1;
      }),
    [members, ownerId],
  );

  // Server user ids differ from Neon ids, so identify the owner by email.
  const owner = sorted.find((m) => m.id === ownerId || m.role === "owner");
  const canManage = Boolean(owner && user?.email && owner.email?.toLowerCase() === user.email.toLowerCase());

  async function invite(e) {
    e.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy("invite");
    try {
      const member = await boardApi.addMember(boardId, { email: address, role });
      setMembers((list) => [...list.filter((m) => m.id !== member.id), member]);
      setEmail("");
      toast.success(`Invited ${member.name || member.email}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(member) {
    setBusy(member.id);
    try {
      await boardApi.removeMember(boardId, member.id);
      setMembers((list) => list.filter((m) => m.id !== member.id));
      toast.success(`Removed ${member.name || member.email}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Share whiteboard" description="Invite people by email to collaborate.">
      {canManage ? (
        <form onSubmit={invite} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            required
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            aria-label="Email address"
          />
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-32" aria-label="Role">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </Select>
          <Button type="submit" loading={busy === "invite"} disabled={Boolean(busy)}>
            {busy !== "invite" && <UserPlus className="h-4 w-4" />}
            Invite
          </Button>
        </form>
      ) : (
        <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm text-muted">Only the owner can invite or remove people.</p>
      )}

      <h3 className="mt-6 text-xs font-medium text-muted">People with access ({sorted.length})</h3>
      <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {sorted.map((m) => {
          const isOwner = m.id === ownerId || m.role === "owner";
          const memberRole = isOwner ? "owner" : m.role;
          return (
            <li key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
              <Avatar user={m} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">{m.name || m.email}</div>
                <div className="truncate text-xs text-muted">{m.email}</div>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium capitalize", ROLE_STYLES[memberRole])}>
                {memberRole}
              </span>
              {canManage && !isOwner && (
                <Button
                  variant="ghost"
                  size="iconSm"
                  loading={busy === m.id}
                  disabled={Boolean(busy)}
                  onClick={() => remove(m)}
                  aria-label={`Remove ${m.name || m.email}`}
                  className="hover:text-danger"
                >
                  {busy !== m.id && <X className="h-4 w-4" />}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
