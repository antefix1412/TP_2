function App() {
  return (
    <div style={{
      backgroundColor: '#000',
      color: '#0ff',
      minHeight: '100vh',
      padding: '20px',
      fontSize: '24px',
      textAlign: 'center'
    }}>
      <h1>TEST CHROME</h1>
      <p>Si vous voyez ce texte, ça marche !</p>
      <button style={{
        backgroundColor: '#0ff',
        color: '#000',
        padding: '10px 20px',
        border: 'none',
        fontSize: '18px',
        cursor: 'pointer'
      }}>
        Bouton test
      </button>
    </div>
  );
}

export default App;