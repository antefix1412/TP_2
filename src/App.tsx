
/**
 * Gestionnaire de Tâches - Application React TypeScript
 * 
 * Application complète de gestion de tâches avec :
 * - Création, modification et suppression de tâches
 * - Filtrage et tri des tâches  
 * - Persistance dans localStorage
 * - Interface cyberpunk avec animations
 * - Validation des formulaires
 * - Gestion des dates d'échéance
 * 
 * @author Antoine
 * @date Octobre 2025
 */
import { useState, useEffect, useMemo } from 'react';
import './App.css';

// ===== TYPES ET INTERFACES =====
/**
 * Interface représentant une tâche complète avec toutes ses propriétés
 */
interface Task {
  id: string;                    // Identifiant unique généré automatiquement
  title: string;                 // Titre de la tâche (obligatoire)
  description?: string;          // Description optionnelle de la tâche
  dueDate?: Date;               // Date d'échéance optionnelle
  completed: boolean;           // Statut de completion (true = terminée)
  createdAt: Date;              // Date de création automatique
  updatedAt: Date;              // Date de dernière modification
}

/**
 * Données du formulaire pour créer une nouvelle tâche
 * Utilisé pour la saisie utilisateur avant conversion en Task
 */
interface TaskFormData {
  title: string;                // Titre saisi dans le formulaire
  description: string;          // Description saisie (peut être vide)
  dueDate: string;             // Date au format string (input HTML date)
}

/**
 * Statistiques calculées des tâches pour l'affichage
 */
interface TaskStats {
  total: number;               // Nombre total de tâches
  completed: number;           // Nombre de tâches terminées
  pending: number;             // Nombre de tâches en cours
}

// Types union pour les options de filtrage et tri
type TaskFilter = 'all' | 'pending' | 'completed';  // Filtres disponibles
type TaskSort = 'newest' | 'oldest' | 'dueDate' | 'alphabetical';  // Options de tri

// ===== HOOKS PERSONNALISÉS =====

/**
 * Hook personnalisé pour gérer la persistance dans localStorage
 * Synchronise automatiquement l'état React avec localStorage
 * Gère les erreurs de parsing JSON et la synchronisation entre onglets
 * 
 * @param key - Clé du localStorage
 * @param initialValue - Valeur par défaut si aucune donnée trouvée
 * @returns [valeur, setter] comme useState
 */
function useLocalStorage<T>(key: string, initialValue: T) {
  // Fonction pour récupérer la valeur stockée depuis localStorage
  const getStoredValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // En cas d'erreur (JSON malformé, etc.), utiliser la valeur par défaut
      console.warn(`Erreur lors de la lecture de localStorage pour la clé "${key}":`, error);
      return initialValue;
    }
  };

  // État local synchronisé avec localStorage
  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  // Fonction pour mettre à jour la valeur (accepte une valeur ou une fonction)
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Support des fonctions de mise à jour comme useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // Synchronisation immédiate avec localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Erreur lors de l'écriture dans localStorage pour la clé "${key}":`, error);
    }
  };

  // Écouter les changements de localStorage dans d'autres onglets
  // Permet la synchronisation en temps réel entre plusieurs onglets
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Vérifier si le changement concerne notre clé
      if (e.key === key && e.newValue !== null) {
        try {
          // Mettre à jour l'état local avec la nouvelle valeur
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Erreur lors de la synchronisation de localStorage pour la clé "${key}":`, error);
        }
      }
    };

    // Ajouter l'écouteur d'événements storage
    window.addEventListener('storage', handleStorageChange);
    // Nettoyer l'écouteur lors du démontage du composant
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue] as const;
}

/**
 * Génère un identifiant unique pour une nouvelle tâche
 * Combine timestamp actuel et chaîne aléatoire pour éviter les collisions
 * Format: "task_[timestamp]_[chaîne aléatoire]"
 */
const generateTaskId = (): string => {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Hook principal pour la gestion complète des tâches
 * Centralise toute la logique métier :
 * - CRUD des tâches (Create, Read, Update, Delete)
 * - Filtrage par statut
 * - Tri selon différents critères
 * - Calcul des statistiques
 * - Persistance automatique
 */
function useTasks() {
  // État des tâches persisté automatiquement dans localStorage
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  // Filtre actuel (état local, non persisté)
  const [filter, setFilter] = useState<TaskFilter>('all');
  // Tri actuel (état local, non persisté)
  const [sort, setSort] = useState<TaskSort>('newest');

  // Calcul en temps réel des statistiques basées sur les tâches
  const stats: TaskStats = useMemo(() => {
    const completed = tasks.filter(task => task.completed).length;
    return {
      total: tasks.length,
      completed,
      pending: tasks.length - completed
    };
  }, [tasks]); // Recalculé à chaque changement de tâches

  /**
   * Crée une nouvelle tâche à partir des données du formulaire
   * - Génère un ID unique
   * - Nettoie et valide les données
   * - Ajoute les timestamps
   * - Persiste automatiquement via useLocalStorage
   */
  const createTask = (taskData: TaskFormData) => {
    const newTask: Task = {
      id: generateTaskId(),
      title: taskData.title.trim(),
      description: taskData.description.trim() || undefined, // Vide = undefined
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : undefined,
      completed: false, // Nouvelle tâche toujours non terminée
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Ajouter la nouvelle tâche à la fin de la liste
    setTasks(prevTasks => [...prevTasks, newTask]);
  };

  /**
   * Bascule le statut de completion d'une tâche
   * Met à jour uniquement la tâche concernée et le timestamp
   */
  const toggleTaskComplete = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId
          ? { ...task, completed: !task.completed, updatedAt: new Date() }
          : task
      )
    );
  };

  /**
   * Supprime définitivement une tâche
   * Filtre la liste pour exclure la tâche avec l'ID donné
   */
  const deleteTask = (taskId: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  // Application du filtre sélectionné sur toutes les tâches
  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => !task.completed);
      case 'completed':
        return tasks.filter(task => task.completed);
      default: // 'all'
        return tasks;
    }
  }, [tasks, filter]);

  // Application du tri sur les tâches déjà filtrées
  // Les tâches terminées sont toujours placées en fin de liste
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

// ===== COMPOSANTS REACT =====

/**
 * Composant formulaire pour créer une nouvelle tâche
 * Fonctionnalités :
 * - Validation en temps réel des champs
 * - Gestion des erreurs
 * - Réinitialisation après soumission
 * - Validation des dates (pas dans le passé)
 */
function TaskForm({ onSubmit }: { onSubmit: (task: TaskFormData) => void }) {
  // État local du formulaire
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: ''
  });

  // État des erreurs de validation
  const [errors, setErrors] = useState<Partial<TaskFormData>>({});

  /**
   * Valide le formulaire selon les règles métier
   * - Titre obligatoire (min 3 caractères)
   * - Date d'échéance non dans le passé
   */
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

/**
 * Composant pour filtrer et trier les tâches
 * Affiche les options de filtrage par statut et de tri
 * Inclut les compteurs dynamiques pour chaque filtre
 */
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

/**
 * Composant de dialogue de confirmation modal
 * Utilisé pour confirmer les actions destructives (suppression)
 * Bloque l'interaction avec le reste de l'interface
 */
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

/**
 * Composant représentant une tâche individuelle
 * Fonctionnalités :
 * - Affichage complet des informations
 * - Checkbox pour marquer comme terminée
 * - Badges visuels pour les échéances
 * - Confirmation avant suppression
 * - Formatage intelligent des dates
 */
function TaskItem({ task, onToggle, onDelete }: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // État local pour gérer l'affichage du dialogue de confirmation
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  /**
   * Formate une date pour l'affichage en français
   */
  const formatDate = (date: Date | undefined) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  /**
   * Détermine si une tâche est en retard
   * Une tâche est en retard si sa date d'échéance est passée
   * Les tâches terminées ne sont jamais considérées en retard
   */
  const isOverdue = (dueDate: Date | undefined) => {
    if (!dueDate || task.completed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Minuit pour comparaison précise
    return dueDate < today;
  };

  /**
   * Détermine si une tâche arrive bientôt à échéance
   * "Bientôt" = dans les 3 prochains jours
   * Les tâches terminées ne sont jamais urgentes
   */
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

/**
 * Composant principal de gestion des tâches
 * Orchestre l'affichage :
 * - État vide quand aucune tâche
 * - Filtres et options de tri
 * - Liste des tâches avec tous les contrôles
 * - Messages contextuels selon le filtre actif
 */
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

// ===== COMPOSANT PRINCIPAL =====

/**
 * Composant racine de l'application
 * Orchestre tous les sous-composants et gère l'état global
 * Initialise les animations et structure la page
 */
function App() {
  // Récupération de toutes les fonctionnalités du hook useTasks
  const { 
    tasks,                    // Liste des tâches triées et filtrées
    stats,                    // Statistiques (total, completed, pending)
    filter,                   // Filtre actuel appliqué
    sort,                     // Tri actuel appliqué
    createTask,               // Fonction pour créer une nouvelle tâche
    toggleTaskComplete,       // Fonction pour basculer le statut
    deleteTask,               // Fonction pour supprimer une tâche
    setFilter,                // Fonction pour changer le filtre
    setSort                   // Fonction pour changer le tri
  } = useTasks();

  // Activer les animations CSS après le chargement initial
  // Permet des transitions fluides dès l'affichage
  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.classList.add('loaded');
    }, 100); // Délai court pour éviter les scintillements
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
