/**
 * BackgroundRemovalProcessor Component
 * Uses WebView to run @imgly/background-removal locally
 * No API calls - works completely offline!
 */

import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function BackgroundRemovalProcessor({ 
  imageUrl, 
  onSuccess, 
  onError,
  onProgress 
}) {
  const webViewRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: system-ui; 
      text-align: center; 
      background: #f5f5f5;
    }
    #status { 
      margin: 20px 0; 
      font-size: 16px;
      color: #333;
    }
    #progress {
      width: 80%;
      height: 20px;
      background: #ddd;
      border-radius: 10px;
      margin: 20px auto;
      overflow: hidden;
    }
    #progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #8BC34A);
      width: 0%;
      transition: width 0.3s;
    }
  </style>
</head>
<body>
  <div id="status">Initializing...</div>
  <div id="progress">
    <div id="progress-bar"></div>
  </div>
  <img id="sourceImage" src="${imageUrl}" style="max-width:100%; display:none" />
  
  <script type="module">
    try {
      // Import the background removal library
      const removeBackground = (await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/browser.min.js')).default;
      
      const statusDiv = document.getElementById('status');
      const progressBar = document.getElementById('progress-bar');
      const img = document.getElementById('sourceImage');
      
      statusDiv.textContent = 'Removing background...';
      
      // Wait for image to load
      if (!img.complete) {
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = () => {
            throw new Error('Failed to load image');
          };
        });
      }
      
      // Process the image
      const blob = await removeBackground(img, {
        progress: (key, current, total) => {
          const percent = Math.round((current / total) * 100);
          progressBar.style.width = percent + '%';
          statusDiv.textContent = \`Processing: \${percent}%\`;
          
          // Send progress to React Native
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ 
              type: 'progress', 
              value: percent 
            }));
          }
        }
      });
      
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = function() {
        statusDiv.textContent = 'Complete!';
        progressBar.style.width = '100%';
        
        // Send result to React Native
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ 
            type: 'success', 
            data: reader.result 
          }));
        }
      };
      reader.onerror = function(error) {
        throw new Error('Failed to convert image: ' + error);
      };
      reader.readAsDataURL(blob);
      
    } catch (error) {
      document.getElementById('status').textContent = 'Error: ' + error.message;
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ 
          type: 'error', 
          message: error.message || error.toString()
        }));
      }
    }
  </script>
</body>
</html>
  `;

  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'progress':
          setProgress(message.value);
          if (onProgress) onProgress(message.value);
          break;
          
        case 'success':
          if (onSuccess) onSuccess(message.data);
          break;
          
        case 'error':
          if (onError) onError(new Error(message.message));
          break;
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
      if (onError) onError(error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <ActivityIndicator size="small" color="#4CAF50" />
        <Text style={styles.statusText}>
          Processing locally: {progress}%
        </Text>
      </View>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        style={styles.webview}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          if (onError) onError(new Error('WebView error: ' + nativeEvent.description));
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 1,
    height: 1,
    opacity: 0,
    position: 'absolute',
    bottom: -1000,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  webview: {
    width: 1,
    height: 1,
  },
});
