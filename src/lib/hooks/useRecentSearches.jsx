/**
 * useRecentSearches — Manages the "recent searches" list persisted in localStorage.
 *
 * Returns:
 *   items        – array of { id, name, brand }
 *   add(item)    – push an item to the front (deduped, capped at MAX)
 *   remove(id)   – remove an item by id
 */
import { useState, useCallback } from 'react'

const STORAGE_KEY = 'grossary_recent_searches'
const MAX_ITEMS = 5

function read() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] } catch { return [] }
}

function write(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

export default function useRecentSearches() {
  const [items, setItems] = useState(read)

  const add = useCallback((item) => {
    const next = [item, ...read().filter((r) => r.id !== item.id)].slice(0, MAX_ITEMS)
    write(next)
    setItems(next)
  }, [])

  const remove = useCallback((id) => {
    const next = read().filter((r) => r.id !== id)
    write(next)
    setItems(next)
  }, [])

  return { items, add, remove }
}
