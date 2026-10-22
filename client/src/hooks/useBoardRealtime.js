import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { connectSocket, getSocket } from "../lib/socket";

/*
 * Joins a board's socket room and exposes presence, remote cursors and live emitters.
 * handlers: { onElementCreated, onElementUpdated, onElementDeleted, onLive,
 *             onBoardUpdated, onMemberAdded, onMemberRemoved }
 */
export function useBoardRealtime(boardId, handlers) {
  const [viewers, setViewers] = useState([]);
  const [cursors, setCursors] = useState({});

  // Listeners stay registered once; they always call the latest handlers.
  const handlersRef = useRef(handlers);
  useLayoutEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!boardId) return;
    const socket = getSocket();
    const call = (name) => (payload) => handlersRef.current?.[name]?.(payload);

    const join = () => socket.emit("wb:join", boardId);
    const dropUser = (id) => {
      setViewers((list) => list.filter((v) => v.id !== id));
      setCursors((all) => {
        if (!(id in all)) return all;
        const next = { ...all };
        delete next[id];
        return next;
      });
    };

    const listeners = {
      connect: join,
      "presence:sync": ({ users = [] }) => setViewers(users),
      "presence:join": ({ user }) =>
        user && setViewers((list) => (list.some((v) => v.id === user.id) ? list : [...list, user])),
      "presence:leave": ({ user }) => user && dropUser(user.id),
      "presence:cursor": ({ user, x, y }) =>
        user && setCursors((all) => ({ ...all, [user.id]: { x, y, name: user.name } })),
      "element:created": call("onElementCreated"),
      "element:updated": call("onElementUpdated"),
      "element:deleted": call("onElementDeleted"),
      "element:live": ({ element }) => element && handlersRef.current?.onLive?.(element),
      "board:updated": call("onBoardUpdated"),
      "member:added": call("onMemberAdded"),
      "member:removed": call("onMemberRemoved"),
    };
    for (const [event, fn] of Object.entries(listeners)) socket.on(event, fn);

    // connectSocket refreshes the auth token first; join right away if already connected.
    if (socket.connected) join();
    else connectSocket().catch(() => {});

    return () => {
      if (socket.connected) socket.emit("wb:leave", boardId);
      for (const [event, fn] of Object.entries(listeners)) socket.off(event, fn);
      setViewers([]);
      setCursors({});
    };
  }, [boardId]);

  const emitCursor = useCallback(
    (x, y) => {
      const socket = getSocket();
      if (socket.connected) socket.emit("presence:cursor", { boardId, x, y });
    },
    [boardId],
  );

  const emitLive = useCallback(
    (element) => {
      const socket = getSocket();
      if (socket.connected) socket.emit("element:live", { boardId, element });
    },
    [boardId],
  );

  return { viewers, cursors, emitCursor, emitLive };
}

export default useBoardRealtime;
