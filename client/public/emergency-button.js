// Simple script to inject an emergency recovery button onto the page
(function() {
  // Create the button container
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.zIndex = '9999';
  buttonContainer.style.display = 'flex';
  buttonContainer.style.flexDirection = 'column';
  buttonContainer.style.alignItems = 'flex-end';
  
  // Create the button
  const button = document.createElement('a');
  button.href = '/emergency-test';
  button.target = '_blank';
  button.style.backgroundColor = '#e11d48';
  button.style.color = 'white';
  button.style.padding = '6px 8px';
  button.style.borderRadius = '6px';
  button.style.textDecoration = 'none';
  button.style.fontWeight = 'bold';
  button.style.fontSize = '11px';
  button.style.display = 'flex';
  button.style.alignItems = 'center';
  button.style.gap = '4px';
  button.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
  button.style.border = '1px solid #be123c';
  button.style.transform = 'scale(0.8)'; // Additional size reduction
  
  // Add a subtle animation
  button.style.animation = 'pulseButton 3s infinite';
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes pulseButton {
      0% { transform: scale(0.8); }
      50% { transform: scale(0.83); }
      100% { transform: scale(0.8); }
    }
  `;
  document.head.appendChild(styleSheet);
  
  // Add alert icon
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
      <path d="M12 9v4"></path>
      <path d="M12 17h.01"></path>
    </svg>
    Recovery
  `;
  
  // Add the button to the container
  buttonContainer.appendChild(button);
  
  // Add help text below the button
  const helpText = document.createElement('div');
  helpText.textContent = 'Fix stalled process';
  helpText.style.marginTop = '3px';
  helpText.style.fontSize = '9px';
  helpText.style.fontWeight = 'bold';
  helpText.style.color = '#e11d48';
  helpText.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
  helpText.style.padding = '2px 4px';
  helpText.style.borderRadius = '3px';
  helpText.style.border = '1px solid #e11d48';
  helpText.style.transform = 'scale(0.9)';
  
  buttonContainer.appendChild(helpText);
  
  // Add the container to the document
  document.body.appendChild(buttonContainer);
})();