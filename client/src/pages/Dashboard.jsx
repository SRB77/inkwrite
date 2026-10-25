import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { LayoutGrid, PenLine, Plus, Trash2, Users } from "lucide-react";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import { Input, Select, Textarea } from "../components/ui/Input";
import UserMenu from "../components/UserMenu";
import BoardThumbnail from "../components/BoardThumbnail";
import { boardApi } from "../lib/api";
import { relativeTime } from "../lib/utils";

const TINTS = ["#ebf6ef", "#eef4ff", "#fdf2f8", "#fefce8", "#f5f3ff", "#fff7ed"];
const EMPTY_FORM = { title: "", description: "", background: "dots" };

function BoardCard({ board, index, onDelete }) {
  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${board.title}"? This can't be undone.`)) return;
    try {
      await boardApi.remove(board.id);
      onDelete(board.id);
      toast.success("Whiteboard deleted");
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="card group relative overflow-hidden rounded-2xl transition-all duration-300 ease-[var(--ease-spring)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]">
      {/* Full-card link sits underneath; the delete button floats above it. */}
      <Link to={`/board/${board.id}`} className="focus-ring absolute inset-0 z-0 rounded-2xl" aria-label={`Open ${board.title}`} />

      <div
        className="h-32 border-b border-line p-3"
        style={{ background: `linear-gradient(180deg, ${TINTS[index % TINTS.length]} 0%, #ffffff 100%)` }}
      >
        <BoardThumbnail boardId={board.id} updatedAt={board.updated_at} />
      </div>

      <div className="pointer-events-none relative p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display font-semibold text-ink">{board.title}</h3>
          {board.is_owner && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label={`Delete ${board.title}`}
              className="focus-ring pointer-events-auto relative z-10 -mt-1 -mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-faint opacity-0 transition-all group-hover:opacity-100 hover:bg-danger/10 hover:text-danger focus-visible:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {board.description && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{board.description}</p>}
        <div className="tabular mt-3 flex items-center justify-between text-xs text-faint">
          <span>
            {board.element_count} {board.element_count === 1 ? "item" : "items"}
          </span>
          <span className="flex items-center gap-1.5">
            {!board.is_owner && <Users className="h-3.5 w-3.5" aria-label="Shared with you" />}
            {relativeTime(board.updated_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

function CreateBoardModal({ open, onClose }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Give your whiteboard a title");
    setLoading(true);
    try {
      const board = await boardApi.create({ ...form, title: form.title.trim() });
      navigate(`/board/${board.id}`);
    } catch (err) {
      toast.error(err.message);
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New whiteboard"
      description="Give it a name and pick a background."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-board-form" loading={loading}>
            Create &amp; open
          </Button>
        </>
      }
    >
      <form id="create-board-form" onSubmit={onSubmit} className="space-y-4">
        <Input label="Title" autoFocus required placeholder="Product roadmap" value={form.title} onChange={update("title")} />
        <Textarea
          label="Description (optional)"
          rows={2}
          placeholder="What's this board for?"
          value={form.description}
          onChange={update("description")}
        />
        <Select label="Background" value={form.background} onChange={update("background")}>
          <option value="dots">Dotted grid</option>
          <option value="grid">Lined grid</option>
          <option value="plain">Plain</option>
        </Select>
      </form>
    </Modal>
  );
}

export default function Dashboard() {
  const [boards, setBoards] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    boardApi
      .list()
      .then(setBoards)
      .catch((err) => {
        toast.error(err.message);
        setBoards([]);
      });
  }, []);

  const removeBoard = (id) => setBoards((list) => list.filter((b) => b.id !== id));
  const newButton = (
    <Button onClick={() => setCreating(true)}>
      <Plus className="h-4 w-4" />
      New whiteboard
    </Button>
  );

  return (
    <div className="min-h-screen bg-bg">
      <header className="glass sticky top-0 z-20 border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <Link to="/" className="focus-ring inline-flex items-center gap-2.5 rounded-xl">
            <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white">
              <PenLine className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-xl font-bold">Inkwrite</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Your whiteboards</h1>
            <p className="tabular mt-1 text-sm text-muted">
              {boards === null ? " " : `${boards.length} ${boards.length === 1 ? "board" : "boards"}`}
            </p>
          </div>
          {newButton}
        </div>

        {boards === null ? (
          <div className="grid place-items-center py-24">
            <Spinner label="Loading your boards..." />
          </div>
        ) : boards.length === 0 ? (
          <div className="card animate-in mt-8 rounded-3xl py-20 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <LayoutGrid className="h-6 w-6" />
            </div>
            <h2 className="mt-5 font-display text-xl font-semibold">No whiteboards yet</h2>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              Create your first board to start sketching, brainstorming and collaborating.
            </p>
            <div className="mt-6">{newButton}</div>
          </div>
        ) : (
          <div className="animate-in mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boards.map((b, i) => (
              <BoardCard key={b.id} board={b} index={i} onDelete={removeBoard} />
            ))}
          </div>
        )}
      </main>

      <CreateBoardModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
