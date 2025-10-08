import { useState, useEffect } from 'react';

// Types
interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Date;
}

// Hook localStorage
function useLocalStorage(key: string, initialValue: Task[]) {
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item).map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt)
      })) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Erreur localStorage:', error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}

// Styles CSS en objet
const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #050507 0%, #0a0a0f 50%, #1a1a2e 100%)',
    color: '#00d4ff',
    fontFamily: 'Inter, sans-serif',
    padding: '20px'
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px'
  },
  title: {
    fontSize: '2.5rem',
    color: '#00d4ff',
    textShadow: '0 0 10px #00d4ff',
    marginBottom: '10px'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '30px'
  },
  form: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '20px',
    padding: '25px',
    boxShadow: '0 0 20px rgba(0,212,255,0.2)'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.3)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#00d4ff',
    fontSize: '16px',
    marginBottom: '15px'
  },
  button: {
    width: '100%',
    padding: '12px 20px',
    background: 'linear-gradient(45deg, #00d4ff, #b834ff)',
    border: 'none',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '15px'
  },
  task: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '20px',
    transition: 'all 0.3s ease'
  },
  taskCompleted: {
    opacity: 0.6,
    textDecoration: 'line-through'
  },
  taskTitle: {
    color: 'white',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  taskDesc: {
    color: '#00d4ff',
    marginBottom: '15px',
    lineHeight: '1.6'
  },
  taskActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  deleteBtn: {
    padding: '8px 16px',
    background: 'rgba(255,71,87,0.2)',
    color: '#ff4757',
    border: '1px solid #ff4757',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  checkbox: {
    marginRight: '10px',
    transform: 'scale(1.2)'
  },
  filters: {
    background: 'rgba(255,255,255,0.03)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '15px',
    padding: '20px',
    marginBottom: '20px'
  },
  filterButton: {
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.3)',
    border: '2px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#00d4ff',
    cursor: 'pointer',
    marginRight: '10px'
  },
  filterButtonActive: {
    background: 'linear-gradient(45deg, #00d4ff, #b834ff)',
    color: 'white'
  }
};

function App() {
  const [tasks, setTasks] = useLocalStorage('tasks', []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Ajouter une tâche
  const addTask = () => {
    if (title.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: title.trim(),
        description: description.trim(),
        completed: false,
        createdAt: new Date()
      };
      setTasks([...tasks, newTask]);
      setTitle('');
      setDescription('');
    }
  };

  // Toggle completion
  const toggleTask = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  // Supprimer une tâche
  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // Filtrer les tâches
  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
    return true;
  });

  // Stats
  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>🚀 Gestionnaire de Tâches</h1>
        <p>Total: {stats.total} | Terminées: {stats.completed} | En cours: {stats.pending}</p>
      </header>

      <div style={styles.container}>
        {/* Formulaire */}
        <div style={styles.form}>
          <h2 style={{color: '#b834ff', marginBottom: '20px'}}>➕ Nouvelle Tâche</h2>
          
          <input
            style={styles.input}
            type="text"
            placeholder="Titre de la tâche..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTask()}
          />
          
          <textarea
            style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
            placeholder="Description (optionnelle)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          
          <button 
            style={styles.button}
            onClick={addTask}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Ajouter la tâche
          </button>
        </div>

        {/* Liste des tâches */}
        <div>
          {/* Filtres */}
          <div style={styles.filters}>
            <h3 style={{color: '#b834ff', marginBottom: '15px'}}>🔍 Filtres</h3>
            
            {(['all', 'pending', 'completed'] as const).map(filterType => (
              <button
                key={filterType}
                style={{
                  ...styles.filterButton,
                  ...(filter === filterType ? styles.filterButtonActive : {})
                }}
                onClick={() => setFilter(filterType)}
              >
                {filterType === 'all' ? 'Toutes' : 
                 filterType === 'pending' ? 'En cours' : 'Terminées'}
              </button>
            ))}
          </div>

          {/* Tâches */}
          <div style={styles.taskList}>
            {filteredTasks.length === 0 ? (
              <div style={{
                ...styles.task,
                textAlign: 'center',
                color: '#b834ff',
                fontSize: '1.2rem'
              }}>
                {filter === 'all' ? '📝 Aucune tâche créée' :
                 filter === 'pending' ? '✅ Aucune tâche en cours' :
                 '🎉 Aucune tâche terminée'}
              </div>
            ) : (
              filteredTasks.map(task => (
                <div 
                  key={task.id} 
                  style={{
                    ...styles.task,
                    ...(task.completed ? styles.taskCompleted : {})
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'flex-start', marginBottom: '15px'}}>
                    <input
                      type="checkbox"
                      style={styles.checkbox}
                      checked={task.completed}
                      onChange={() => toggleTask(task.id)}
                    />
                    <div style={{flex: 1}}>
                      <div style={styles.taskTitle}>{task.title}</div>
                      {task.description && (
                        <div style={styles.taskDesc}>{task.description}</div>
                      )}
                      <small style={{color: '#666'}}>
                        Créée le {task.createdAt.toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                  
                  <div style={styles.taskActions}>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => deleteTask(task.id)}
                      onMouseOver={(e) => e.currentTarget.style.background = '#ff4757'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,71,87,0.2)'}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;