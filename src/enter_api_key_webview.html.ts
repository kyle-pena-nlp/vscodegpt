export const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat GPT First Time Setup</title>
</head>
<body>

<style>

    #wrapper {
      width: 90%;
      margin: 0 auto;
    }

    #validationIcon, #apiKeyInput, #okButton {
      transition-property: color, background-color, opacity;
      transition-duration: 1.0s;
    }
    
    #validationIcon {
      opacity: 0.0;
    }
    #wrapper.valid #validationIcon {
      color: green;
      opacity: 1.0;
    }
    #wrapper.invalid #validationIcon {
      color: red;
      opacity: 1.0;
    }
    #wrapper.noaccess #validationIcon {
      color: yellow;
      opacity: 1.0;
    }
    #wrapper.saveAPIKeySuccess #validationIcon {
        color: green;
        opacity: 0.0;
    }
    
    #apiKeyInput {
      width: 80%;
      border: 2px solid black;
    }
    #wrapper.valid #apiKeyInput {
      border: 2px solid green;
      background-color: PaleGreen;
    }
    #wrapper.invalid #apiKeyInput {
      border: 2px solid red;
    }
    #wrapper.noaccess #apiKeyInput {
      border: 2px solid yellow;
    }
    #wrapper.saveAPIKeySuccess #apiKeyInput {
        border: 2px solid green;
        background-color: LightGray;
        readOnly: true;
    }    
    #apiKeyInput {
          outline: none !important;
    }
    
    #okButton {
      display: none;
      opacity: 0.0;
    }
    #wrapper.valid #okButton {
      display: block;
      opacity: 1.0;
    }
    #wrapper.invalid #okButton {
      display: none;
      opacity: 0.0;
    }
    #wrapper.noaccess #okButton {
      display: none;
      opacity: 0.0;
    }
    #wrapper.saveAPIKeySuccess #okButton {
        opacity: 0.0;
    }
    
</style>

  <h1>
  ChatGPT Agent First Time Setup
  </h1>

  This extension requires an OpenAI API key to talk to ChatGPT.
  
  <ol>
    <li><a href="https://platform.openai.com/signup?launch">Sign up</a> for OpenAI's API.</li>
    <li>Visit <a href="https://platform.openai.com/account/api-keys">here</a> to create a new OpenAI API key.</li>
    <li>Copy and paste your API key into the textbox below:</li>
  </ol>
  

  
  <div id="wrapper">
    <input type="text" id="apiKeyInput" placeholder="Enter API Key">
    <span id="validationIcon"></span>
    <span id="statusBox"></span>
    <button id="okButton">Save API Key Into Extension Settings</button>
  </div>
  <p id="afterSaveMessage">
  This API key will be saved in this extension's settings 
  and can be modified at any time: File → Preferences → Settings → Extensions → ChatGPT Agent.
  </p>
  <script>
    const vscode = acquireVsCodeApi();

    const apiKeyInput = document.getElementById('apiKeyInput');
    const validationIcon = document.getElementById('validationIcon');
    const statusBox = document.getElementById('statusBox');
    const okButton = document.getElementById('okButton');
    const wrapper = document.getElementById('wrapper');

    // When the user stops typing, validate the key
    let typingTimer;
    const doneTypingInterval = 500; // Delay in milliseconds
    apiKeyInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(async () => {
            const apiKey = apiKeyInput.value;
            console.debug(apiKey);
            vscode.postMessage({ type: 'validateAPIKey', payload: apiKey });
            /*
            const someState = ['valid','invalid','noaccess'][Math.floor(Math.random() * 3)];
            const { icon, className, status } = getUIState(someState);
            validationIcon.textContent = icon;
            wrapper.className = className;
            statusBox.textContent = status;
            apiKeyInput.readOnly = inputReadOnly;
            */      
        }, doneTypingInterval);
    });
    
    // update HTML stuff based on state of API key
    function getUIState(validationResult) {
        if (validationResult == 'valid') {
            return {
                "icon": '✓',
                "className": "valid",
                "status": "Valid API Key",
            };
        }
        else if (validationResult == 'invalid') {
            return {
                "icon": '✗',
                "className": "invalid",
                "status": "Invalid API Key",
            };            
        }
        else if (validationResult == 'noaccess') {
            return {
                "icon": "?",
                "className": "noaccess",
                "status": "Cannot reach OpenAI to validate key. Check your internet connection?",
            };
        }
        else {
            // programmer error
            return {
                "icon": "?",
                "className": "?",
                "status": "?",
            };
        }
    }

    // When the key has been validated, update the UI state
    window.addEventListener('message', event => {
        const message = event.data;
        if (message.type === 'validationResult') {
            const apiKeyValidationResult = message.payload;
            const { icon, className, status } = getUIState(apiKeyValidationResult);
            validationIcon.textContent = icon;
            wrapper.className = className;
            statusBox.textContent = status;
        }
        else if (message.type == 'setAPIKey') {
            apiKeyInput.value = message.payload;
            apiKeyInput.dispatchEvent(new Event("input"))
        }
        else if (message.type == 'saveAPIKeySuccess') {
            wrapper.className = 'saveAPIKeySuccess';
            apiKeyInput.readOnly = true;
            statusBox.textContent = "Saved."
        }
    });

    okButton.addEventListener('click', (el,ev) => {
        const apiKey = apiKeyInput.value;
        vscode.postMessage({ type: 'saveAPIKey', payload: apiKey });          
    })
</script>
</body>
</html>`;