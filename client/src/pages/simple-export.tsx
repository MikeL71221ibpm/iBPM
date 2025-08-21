// A super simple export button example with minimal dependencies
import React from "react";

export default function SimpleExport() {
  const exportCSV = () => {
    // Sample data
    const data = [
      { id: "Housing", value: 312 },
      { id: "Food", value: 267 },
      { id: "Transportation", value: 241 },
      { id: "Financial", value: 182 }
    ];
    
    // Convert to CSV
    const headers = "id,value";
    const rows = data.map(item => `${item.id},${item.value}`).join('\n');
    const csvContent = `${headers}\n${rows}`;
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = "export-demo.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert("Download started!");
  };
  
  const styles = {
    container: {
      padding: "30px",
      maxWidth: "800px",
      margin: "0 auto",
      fontFamily: "Arial, sans-serif"
    },
    header: {
      fontSize: "24px",
      fontWeight: "bold",
      marginBottom: "20px"
    },
    card: {
      border: "1px solid #ccc",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px",
      position: "relative"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      marginTop: "20px"
    },
    th: {
      backgroundColor: "#f2f2f2",
      border: "1px solid #ddd",
      padding: "8px",
      textAlign: "left"
    },
    td: {
      border: "1px solid #ddd",
      padding: "8px"
    },
    button: {
      position: "absolute",
      top: "20px",
      right: "20px",
      backgroundColor: "#1a73e8",
      color: "white",
      border: "none",
      padding: "10px 15px",
      borderRadius: "4px",
      cursor: "pointer",
      fontWeight: "bold"
    }
  };
  
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Export Button Demo</h1>
      
      <div style={styles.card}>
        <h2>HRSN Indicators</h2>
        <button 
          onClick={exportCSV} 
          style={styles.button}
        >
          Export CSV
        </button>
        
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Indicator</th>
              <th style={styles.th}>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}>Housing</td>
              <td style={styles.td}>312</td>
            </tr>
            <tr>
              <td style={styles.td}>Food</td>
              <td style={styles.td}>267</td>
            </tr>
            <tr>
              <td style={styles.td}>Transportation</td>
              <td style={styles.td}>241</td>
            </tr>
            <tr>
              <td style={styles.td}>Financial</td>
              <td style={styles.td}>182</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div style={{marginTop: "20px"}}>
        <p><strong>Export Button Features:</strong></p>
        <ul>
          <li>Positioned in the top-right corner of the chart</li>
          <li>Blue background to provide high visibility</li>
          <li>Bold text for better readability</li>
          <li>Direct download functionality</li>
        </ul>
      </div>
    </div>
  );
}