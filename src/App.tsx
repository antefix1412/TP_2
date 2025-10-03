
import { useState, useEffect, useMemo } from 'react';
import './App.css';

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
}

interface TaskStats {
  total: number;
  completed: number;
  pending: number;
}

type TaskFilter = 'all' | 'pending' | 'completed';
type TaskSort = 'newest' | 'oldest' | 'dueDate' | 'alphabetical';

// Hooks
function useLocalStorage<T>(key: string, initialValue: T) {
  const getStoredValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erreur lors de la lecture de localStorage pour la clé "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Erreur lors de l'écriture dans localStorage pour la clé "${key}":`, error);
    }
  };

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Erreur lors de la synchronisation de localStorage pour la clé "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue] as const;
}

const generateTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

function useTasks() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [sort, setSort] = useState<TaskSort>('newest');

  const stats: TaskStats = useMemo(() => {
    const completed = tasks.filter(task => task.completed).length;
    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed
    };
  }, [tasks]);

  const createTask = (taskData: TaskFormData) => {
    const newTask: Task = {
      id: generateTaskId(),
      title: taskData.title.trim(),
      description: taskData.description.trim() || undefined,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, completed: !task.completed, updatedAt: new Date() }
          : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const sortedAndFilteredTasks = useMemo(() => {
    const tasksCopy = [...filteredTasks];
    
    switch (sort) {
      case 'oldest':
        return tasksCopy.sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      
      case 'dueDate':
        return tasksCopy.sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
      
      case 'alphabetical':
        return tasksCopy.sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
        });
      
      case 'newest':
      default:
        return tasksCopy.sort((a, b) => {
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          return b.createdAt.getTime() - a.createdAt.getTime();
        });
    }
  }, [filteredTasks, sort]);

  return {
    tasks: sortedAndFilteredTasks,
    stats,
    filter,
    sort,
    createTask,
    toggleTaskComplete,
    deleteTask,
    setFilter,
    setSort
  };
}

// Components
function TaskForm({ onSubmit }: { onSubmit: (task: TaskFormData) => void }) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: ''
  });

  const [errors, setErrors] = useState<Partial<TaskFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<TaskFormData> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Le titre est requis';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Le titre doit contenir au moins 3 caractères';
    }

    if (formData.dueDate) {
      const selectedDate = new Date(formData.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.dueDate = "La date d'échéance ne peut pas être dans le passé";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
      setFormData({
        title: '',
        description: '',
        dueDate: ''
      });
      setErrors({});
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name as keyof TaskFormData]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <div className="form-group">
        <label htmlFor="title">Titre de la tâche *</label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={errors.title ? 'error' : ''}
          placeholder="Entrez le titre de la tâche..."
        />
        {errors.title && <span className="error-message">{errors.title}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Description optionnelle..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label htmlFor="dueDate">Date d'échéance</label>
        <input
          type="date"
          id="dueDate"
          name="dueDate"
          value={formData.dueDate}
          onChange={handleChange}
          className={errors.dueDate ? 'error' : ''}
        />
        {errors.dueDate && <span className="error-message">{errors.dueDate}</span>}
      </div>

      <button type="submit" className="submit-btn">
        Ajouter la tâche
      </button>
    </form>
  );
}

function TaskFilters({ 
  filter, 
  sort, 
  onFilterChange, 
  onSortChange, 
  taskCount 
}: {
  filter: TaskFilter;
  sort: TaskSort;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
  taskCount: TaskStats;
}) {
  return (
    <div className="task-filters">
      <div className="filter-section">
        <h3>Filtrer par statut</h3>
        <div className="filter-buttons">
          <button
            onClick={() => onFilterChange('all')}
            className={filter === 'all' ? 'active' : ''}
          >
            Toutes ({taskCount.total})
          </button>
          <button
            onClick={() => onFilterChange('pending')}
            className={filter === 'pending' ? 'active' : ''}
          >
            En cours ({taskCount.pending})
          </button>
          <button
            onClick={() => onFilterChange('completed')}
            className={filter === 'completed' ? 'active' : ''}
          >
            Terminées ({taskCount.completed})
          </button>
        </div>
      </div>

      <div className="sort-section">
        <h3>Trier par</h3>
        <select 
          value={sort} 
          onChange={(e) => onSortChange(e.target.value as TaskSort)}
          className="sort-select"
        >
          <option value="newest">Plus récentes</option>
          <option value="oldest">Plus anciennes</option>
          <option value="dueDate">Date d'échéance</option>
          <option value="alphabetical">Alphabétique</option>
        </select>
      </div>
    </div>
  );
}

function ConfirmDialog({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-overlay">
      <div className="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button onClick={onCancel} className="cancel-btn">
            Annuler
          </button>
          <button onClick={onConfirm} className="confirm-btn">
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ task, onToggle, onDelete }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  const isOverdue = (dueDate: Date | undefined) => {
    if (!dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const isDueSoon = (dueDate: Date | undefined) => {
    if (!dueDate || task.completed) return false;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    return dueDate >= today && dueDate <= threeDaysFromNow;
  };

  const handleDelete = () => {
    onDelete(task.id);
    setShowConfirmDelete(false);
  };

  return (
    <>
      <div className={`task-item ${task.completed ? 'completed' : ''} ${isOverdue(task.dueDate) ? 'overdue' : ''} ${isDueSoon(task.dueDate) ? 'due-soon' : ''}`}>
        <div className="task-checkbox">
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onToggle(task.id)}
            id={`task-${task.id}`}
          />
          <label htmlFor={`task-${task.id}`} className="checkbox-label">
            <span className="checkmark"></span>
          </label>
        </div>

        <div className="task-content">
          <h3 className="task-title">{task.title}</h3>
          {task.description && (
            <p className="task-description">{task.description}</p>
          )}
          
          <div className="task-meta">
            {task.dueDate && (
              <span className="task-due-date">
                📅 Échéance: {formatDate(task.dueDate)}
                {isOverdue(task.dueDate) && <span className="overdue-badge">En retard</span>}
                {isDueSoon(task.dueDate) && <span className="due-soon-badge">Bientôt</span>}
              </span>
            )}
          </div>
        </div>

        <div className="task-actions">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="delete-btn"
            title="Supprimer la tâche"
          >
            🗑️
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        title="Supprimer la tâche"
        message={`Êtes-vous sûr de vouloir supprimer la tâche "${task.title}" ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </>
  );
}

function TaskList({
  tasks,
  filter,
  sort,
  stats,
  onToggleTask,
  onDeleteTask,
  onFilterChange,
  onSortChange
}: {
  tasks: Task[];
  filter: TaskFilter;
  sort: TaskSort;
  stats: TaskStats;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onFilterChange: (filter: TaskFilter) => void;
  onSortChange: (sort: TaskSort) => void;
}) {
  if (stats.total === 0) {
    return (
      <div className="task-list-empty">
        <div className="empty-state">
          <h3>Aucune tâche pour le moment</h3>
          <p>Commencez par ajouter votre première tâche ci-dessus !</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-list-container">
      <TaskFilters
        filter={filter}
        sort={sort}
        onFilterChange={onFilterChange}
        onSortChange={onSortChange}
        taskCount={stats}
      />

      {tasks.length === 0 ? (
        <div className="task-list-empty">
          <div className="empty-state">
            <h3>Aucune tâche {filter === 'pending' ? 'en cours' : filter === 'completed' ? 'terminée' : ''}</h3>
            <p>
              {filter === 'pending' && 'Toutes vos tâches sont terminées ! 🎉'}
              {filter === 'completed' && 'Aucune tâche terminée pour le moment.'}
              {filter === 'all' && 'Aucune tâche ne correspond aux critères de tri.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggleTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Main App Component
function App() {
  const { 
    tasks, 
    stats, 
    filter, 
    sort, 
    createTask, 
    toggleTaskComplete, 
    deleteTask, 
    setFilter, 
    setSort 
  } = useTasks();

  // Activer les animations après le chargement
  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.classList.add('loaded');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="app loaded">
      <header className="app-header">
        <h1>Gestionnaire de Tâches</h1>
        <p>Organisez vos tâches efficacement avec style</p>
      </header>

      <main className="app-main">
        <div className="app-container">
          <TaskForm onSubmit={createTask} />
          <TaskList
            tasks={tasks}
            stats={stats}
            filter={filter}
            sort={sort}
            onToggleTask={toggleTaskComplete}
            onDeleteTask={deleteTask}
            onFilterChange={setFilter}
            onSortChange={setSort}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
