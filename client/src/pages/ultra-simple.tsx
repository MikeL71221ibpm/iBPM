// Most minimalist possible test page
export default function UltraSimple() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Ultra Simple Export Buttons Demo</h1>
      <p>This is a bare-bones demo with absolutely no dependencies.</p>
      
      <div style={{ 
        border: "1px solid #ccc", 
        padding: "20px", 
        borderRadius: "8px",
        marginTop: "20px"
      }}>
        <h2>Export Options</h2>
        <div style={{ 
          backgroundColor: "#333", 
          padding: "10px", 
          borderRadius: "4px",
          marginBottom: "15px"
        }}>
          <span style={{ color: "white", marginRight: "10px", fontWeight: "bold" }}>
            EXPORT OPTIONS:
          </span>
          <button 
            onClick={() => {
              const csv = "ID,Name,Value\n1,Housing,25\n2,Food,15\n3,Transport,10";
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'data.csv';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }} 
            style={{ 
              backgroundColor: "#2874d1", 
              color: "white", 
              border: "none",
              padding: "5px 10px", 
              borderRadius: "4px", 
              marginRight: "5px", 
              cursor: "pointer" 
            }}
          >
            CSV
          </button>
          <button 
            onClick={() => {
              const json = JSON.stringify({data: [{id: 1, name: "Housing", value: 25}]}, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'data.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }} 
            style={{ 
              backgroundColor: "#e67e22", 
              color: "white", 
              border: "none",
              padding: "5px 10px", 
              borderRadius: "4px", 
              marginRight: "5px", 
              cursor: "pointer" 
            }}
          >
            JSON
          </button>
          <button 
            onClick={() => window.print()} 
            style={{ 
              backgroundColor: "#7f8c8d", 
              color: "white", 
              border: "none",
              padding: "5px 10px", 
              borderRadius: "4px", 
              cursor: "pointer" 
            }}
          >
            Print
          </button>
        </div>
        
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px", backgroundColor: "#f2f2f2" }}>ID</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", backgroundColor: "#f2f2f2" }}>Name</th>
              <th style={{ border: "1px solid #ddd", padding: "8px", backgroundColor: "#f2f2f2" }}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>1</td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>Housing</td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>25</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>2</td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>Food</td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>15</td>
            </tr>
            <tr>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>3</td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>Transport</td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>10</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}