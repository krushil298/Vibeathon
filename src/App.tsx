import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Plus, Trash2, Check, LayoutList, Loader2 } from 'lucide-react';

interface Todo {
  id: string;
  task: string;
  is_completed: boolean;
}

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch initial todos
  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;

    // Optimistic UI Update
    const tempId = crypto.randomUUID();
    const newTodo = { id: tempId, task: newTask, is_completed: false };
    setTodos([newTodo, ...todos]);
    setNewTask('');

    try {
      const { error } = await supabase
        .from('todos')
        .insert([{ task: newTodo.task }]);

      if (error) throw error;
      // Re-fetch to get the real UUID from the database
      fetchTodos();
    } catch (error) {
      console.error('Error adding todo:', error);
      // Revert optimistic update on failure
      setTodos(todos.filter((t) => t.id !== tempId));
    }
  }

  async function toggleTodo(id: string, currentStatus: boolean) {
    // Optimistic UI Update
    setTodos(todos.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t));

    try {
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: !currentStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling todo:', error);
      // Revert optimistic update
      setTodos(todos.map(t => t.id === id ? { ...t, is_completed: currentStatus } : t));
    }
  }

  async function deleteTodo(id: string) {
    // Optimistic UI Update
    const previousTodos = [...todos];
    setTodos(todos.filter(t => t.id !== id));

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting todo:', error);
      // Revert optimistic update
      setTodos(previousTodos);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center py-16 px-4 font-sans selection:bg-indigo-500/30">

      {/* Header */}
      <div className="max-w-xl w-full text-center space-y-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-2">
          <LayoutList className="w-8 h-8 text-indigo-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
          Stay Focused.
        </h1>
        <p className="text-zinc-400 text-lg">
          The fastest way to manage your tasks, powered by Supabase.
        </p>
      </div>

      {/* Main Container */}
      <div className="max-w-xl w-full bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl">

        {/* Input Form */}
        <form onSubmit={addTodo} className="relative flex items-center mb-8 group">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a new task..."
            className="w-full bg-zinc-950/50 border border-zinc-700 rounded-2xl py-4 pl-6 pr-16 text-zinc-100 placeholder:text-zinc-500 outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={!newTask.trim()}
            className="absolute right-2 p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-30 disabled:hover:bg-indigo-500 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>

        {/* Todo List */}
        <div className="space-y-3 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500 space-y-3 pt-20">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p>Syncing with Database...</p>
            </div>
          ) : todos.length === 0 ? (
            <div className="text-center text-zinc-500 pt-20">
              <p>No tasks remaining. You're all caught up! 🎉</p>
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${todo.is_completed
                    ? "bg-zinc-950/50 border-zinc-800/50 opacity-60"
                    : "bg-zinc-900 border-zinc-700 hover:border-indigo-500/50 hover:-translate-y-0.5"
                  }`}
              >
                <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleTodo(todo.id, todo.is_completed)}>
                  <div
                    className={`flex items-center justify-center w-6 h-6 rounded-full border-2 transition-colors ${todo.is_completed
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-zinc-500 group-hover:border-indigo-400"
                      }`}
                  >
                    {todo.is_completed && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span
                    className={`text-base font-medium transition-all ${todo.is_completed ? "line-through text-zinc-500" : "text-zinc-200"
                      }`}
                  >
                    {todo.task}
                  </span>
                </div>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-500/10 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
