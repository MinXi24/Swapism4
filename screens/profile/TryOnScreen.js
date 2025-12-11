import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Icon from '../../assets/icons/icons';
import { config } from '../../config';
import { firestore } from '../../firebaseConfig';
import { colors, fonts, spacing } from '../../lib/theme';

const { width, height } = Dimensions.get('window');

export default function TryOnScreen({ route, navigation }) {
  const { allItems = [] } = route.params || {};
  const [cameraActive, setCameraActive] = useState(false);
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);
  const [processedImages, setProcessedImages] = useState({});
  const [loadingBg, setLoadingBg] = useState({});
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState('front');
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [capturedTransforms, setCapturedTransforms] = useState({
    topScale: 1,
    topTranslateX: 0,
    topTranslateY: 0,
    bottomScale: 1,
    bottomTranslateX: 0,
    bottomTranslateY: 0,
  });
  
  // Gesture state for top overlay
  const topScale = useRef(new Animated.Value(1)).current;
  const topTranslateX = useRef(new Animated.Value(0)).current;
  const topTranslateY = useRef(new Animated.Value(0)).current;
  
  // Gesture state for bottom overlay
  const bottomScale = useRef(new Animated.Value(1)).current;
  const bottomTranslateX = useRef(new Animated.Value(0)).current;
  const bottomTranslateY = useRef(new Animated.Value(0)).current;

  const REMOVE_BG_API_KEY = config?.REMOVE_BG_API_KEY || '';

  // Separate items into tops and bottoms
  const tops = allItems.filter(i => 
    i.clothingType === 'top' ||
    i.title?.toLowerCase().includes('shirt') || 
    i.title?.toLowerCase().includes('top') ||
    i.title?.toLowerCase().includes('jacket') ||
    i.title?.toLowerCase().includes('blouse') ||
    i.description?.toLowerCase().includes('top')
  );
  
  const bottoms = allItems.filter(i => 
    i.clothingType === 'bottom' ||
    i.title?.toLowerCase().includes('pants') || 
    i.title?.toLowerCase().includes('jeans') ||
    i.title?.toLowerCase().includes('shorts') ||
    i.title?.toLowerCase().includes('skirt') ||
    i.description?.toLowerCase().includes('bottom')
  );

  // Remove background function
  const removeBackground = useCallback(async (imageUrl, itemId) => {
    if (processedImages[itemId] || !REMOVE_BG_API_KEY) {
      return processedImages[itemId] || imageUrl;
    }

    setLoadingBg(prev => ({ ...prev, [itemId]: true }));

    try {
      const formData = new FormData();
      formData.append('image_url', imageUrl);
      formData.append('size', 'auto');

      const response = await fetch('https://api.remove.bg/v1.0/removebg', {
        method: 'POST',
        headers: {
          'X-Api-Key': REMOVE_BG_API_KEY,
        },
        body: formData,
      });

      if (response.ok) {
        const blob = await response.blob();
        const base64data = await blobToBase64(blob);
        setProcessedImages(prev => ({ ...prev, [itemId]: base64data }));
        setLoadingBg(prev => ({ ...prev, [itemId]: false }));
        return base64data;
      } else {
        throw new Error('Failed to remove background');
      }
    } catch (error) {
      console.error('Error removing background:', error);
      setLoadingBg(prev => ({ ...prev, [itemId]: false }));
      return imageUrl;
    }
  }, [processedImages, REMOVE_BG_API_KEY]);

  const blobToBase64 = async (blob) => {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
      fileReader.onloadend = () => resolve(fileReader.result);
      fileReader.onerror = reject;
      fileReader.readAsDataURL(blob);
    });
  };

  const requestCameraPermission = async () => {
    const response = await requestPermission();
    return response?.granted;
  };

  const toggleCamera = async () => {
    if (!cameraActive) {
      const granted = await requestCameraPermission();
      if (granted) {
        setCameraActive(true);
      } else {
        alert('Camera permission is required');
      }
    } else {
      setCameraActive(false);
    }
  };

  // Navigation functions
  const navigateTop = (direction) => {
    if (tops.length === 0) return;
    setCurrentTopIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % tops.length;
      } else {
        return prev === 0 ? tops.length - 1 : prev - 1;
      }
    });
  };

  const navigateBottom = (direction) => {
    if (bottoms.length === 0) return;
    setCurrentBottomIndex(prev => {
      if (direction === 'next') {
        return (prev + 1) % bottoms.length;
      } else {
        return prev === 0 ? bottoms.length - 1 : prev - 1;
      }
    });
  };

  // Reset gestures
  const resetGestures = () => {
    Animated.parallel([
      Animated.timing(topScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(topTranslateX, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(topTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(bottomScale, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(bottomTranslateX, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(bottomTranslateY, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const selectedTop = tops[currentTopIndex];
  const selectedBottom = bottoms[currentBottomIndex];

  // Load backgrounds when items change
  useEffect(() => {
    if (selectedTop && !processedImages[selectedTop.id] && !loadingBg[selectedTop.id] && REMOVE_BG_API_KEY) {
      removeBackground(selectedTop.url, selectedTop.id);
    }
  }, [selectedTop, loadingBg, processedImages, removeBackground, REMOVE_BG_API_KEY]);

  useEffect(() => {
    if (selectedBottom && !processedImages[selectedBottom.id] && !loadingBg[selectedBottom.id] && REMOVE_BG_API_KEY) {
      removeBackground(selectedBottom.url, selectedBottom.id);
    }
  }, [selectedBottom, loadingBg, processedImages, removeBackground, REMOVE_BG_API_KEY]);

  // Updated fetchAISuggestions to suggest both tops and bottoms from 'for swap' posts only
  const fetchAISuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const auth = getAuth();
      const currentUserId = auth.currentUser?.uid;

      if (!currentUserId) {
        setSuggestedItems([]);
        setLoadingSuggestions(false);
        return;
      }

      const postsRef = collection(firestore, 'wardrobe-plug-fyp', 'user', 'images');
      const q = query(
        postsRef, 
        where('ownerUid', '!=', currentUserId),
        where('category', '==', 'for swap')
      );
      const snapshot = await getDocs(q);

      const suggestions = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        // Only include items from 'for swap' category
        if (data.url && data.category === 'for swap') {
          suggestions.push({
            id: doc.id,
            url: data.url,
            title: data.title || '',
            ownerUid: data.ownerUid,
            userName: data.userName || 'Unknown User',
            clothingType: data.clothingType,
            category: data.category,
          });
        }
      });

      // Shuffle and take top 5 suggestions
      const shuffled = suggestions.sort(() => 0.5 - Math.random());
      setSuggestedItems(shuffled.slice(0, 5));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestedItems([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [selectedTop, selectedBottom]);

  // Fetch AI suggestions based on selected item
  useEffect(() => {
    if (selectedTop || selectedBottom) {
      fetchAISuggestions();
    }
  }, [selectedTop, selectedBottom, fetchAISuggestions]);

  const toggleCameraFacing = () => {
    setCameraFacing(current => current === 'front' ? 'back' : 'front');
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    
    try {
      // Save current transform values
      setCapturedTransforms({
        topScale: topScale._value,
        topTranslateX: topTranslateX._value,
        topTranslateY: topTranslateY._value,
        bottomScale: bottomScale._value,
        bottomTranslateX: bottomTranslateX._value,
        bottomTranslateY: bottomTranslateY._value,
      });
      
      const photo = await cameraRef.current.takePictureAsync();
      setCapturedPhoto(photo.uri);
      setShowPreview(true);
    } catch (error) {
      console.error('Error capturing photo:', error);
      alert('Failed to capture photo');
    }
  };

  // Save photo to gallery - the photo is captured with overlay visible
  const savePhotoToGallery = async () => {
    if (!capturedPhoto) return;

    try {
      const permission = await requestMediaPermission();
      if (!permission.granted) {
        alert('Permission to access media library is required');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(capturedPhoto);
      alert('Photo saved to gallery!');
      setShowPreview(false);
      setCapturedPhoto(null);
    } catch (error) {
      console.error('Error saving photo:', error);
      alert('Failed to save photo');
    }
  };

  const discardPhoto = () => {
    setShowPreview(false);
    setCapturedPhoto(null);
  };

  const handleSuggestionClick = async (item) => {
    // Determine if item is a top or bottom based on clothingType or keywords
    const isTop = item.clothingType === 'top' || 
      item.title?.toLowerCase().includes('shirt') || 
      item.title?.toLowerCase().includes('top') ||
      item.title?.toLowerCase().includes('jacket') ||
      item.title?.toLowerCase().includes('blouse');

    // Add item to allItems if not already present
    const itemExists = allItems.some(i => i.id === item.id);
    if (!itemExists) {
      allItems.push(item);
    }

    // Auto-remove background for the clicked item
    if (!processedImages[item.id] && REMOVE_BG_API_KEY) {
      removeBackground(item.url, item.id);
    }

    // Set the appropriate index to show this item
    if (isTop) {
      const topsList = allItems.filter(i => 
        i.clothingType === 'top' ||
        i.title?.toLowerCase().includes('shirt') || 
        i.title?.toLowerCase().includes('top') ||
        i.title?.toLowerCase().includes('jacket') ||
        i.title?.toLowerCase().includes('blouse') ||
        i.description?.toLowerCase().includes('top')
      );
      const index = topsList.findIndex(t => t.id === item.id);
      if (index >= 0) {
        setCurrentTopIndex(index);
      }
    } else {
      const bottomsList = allItems.filter(i => 
        i.clothingType === 'bottom' ||
        i.title?.toLowerCase().includes('pants') || 
        i.title?.toLowerCase().includes('jeans') ||
        i.title?.toLowerCase().includes('shorts') ||
        i.title?.toLowerCase().includes('skirt') ||
        i.description?.toLowerCase().includes('bottom')
      );
      const index = bottomsList.findIndex(b => b.id === item.id);
      if (index >= 0) {
        setCurrentBottomIndex(index);
      }
    }
  };

  const navigateToUserProfile = (item) => {
    if (item.ownerUid) {
      navigation.navigate('UserProfile', { userId: item.ownerUid });
    }
  };

  const navigateToPostDetails = (item) => {
    navigation.navigate('PostDetails', { postId: item.id, post: item });
  };

  // Gesture handlers for top overlay
  const topPinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      topScale.setValue(e.scale);
    })
    .runOnJS(true);

  const topPanGesture = Gesture.Pan()
    .onUpdate((e) => {
      topTranslateX.setValue(e.translationX);
      topTranslateY.setValue(e.translationY);
    })
    .runOnJS(true);

  const topComposedGesture = Gesture.Simultaneous(topPinchGesture, topPanGesture);

  // Gesture handlers for bottom overlay
  const bottomPinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      bottomScale.setValue(e.scale);
    })
    .runOnJS(true);

  const bottomPanGesture = Gesture.Pan()
    .onUpdate((e) => {
      bottomTranslateX.setValue(e.translationX);
      bottomTranslateY.setValue(e.translationY);
    })
    .runOnJS(true);

  const bottomComposedGesture = Gesture.Simultaneous(bottomPinchGesture, bottomPanGesture);

  if (cameraActive) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaView style={styles.container}>
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraFacing}
            >
              {/* Camera Controls */}
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.cameraControlButton}
                  onPress={toggleCamera}
                >
                  <Icon name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.cameraTitle}>Virtual Mirror</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Overlay clothes on camera */}
              <View style={styles.clothesOverlay}>
                {/* Top Overlay */}
                {selectedTop && (
                  <View style={styles.topOverlayContainer}>
                    <GestureDetector gesture={topComposedGesture}>
                      <Animated.View
                        style={[
                          styles.gestureContainer,
                          {
                            transform: [
                              { scale: topScale },
                              { translateX: topTranslateX },
                              { translateY: topTranslateY },
                            ],
                          },
                        ]}
                      >
                        <Image 
                          source={{ uri: processedImages[selectedTop.id] || selectedTop.url }} 
                          style={styles.overlayTopImage}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </GestureDetector>
                    
                    {/* Navigation arrows for top */}
                    {tops.length > 1 && (
                      <View style={styles.navigationRow}>
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => navigateTop('prev')}
                        >
                          <Icon name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => navigateTop('next')}
                        >
                          <Icon name="chevron-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}

                {/* Bottom Overlay */}
                {selectedBottom && (
                  <View style={styles.bottomOverlayContainer}>
                    <GestureDetector gesture={bottomComposedGesture}>
                      <Animated.View
                        style={[
                          styles.gestureContainer,
                          {
                            transform: [
                              { scale: bottomScale },
                              { translateX: bottomTranslateX },
                              { translateY: bottomTranslateY },
                            ],
                          },
                        ]}
                      >
                        <Image 
                          source={{ uri: processedImages[selectedBottom.id] || selectedBottom.url }} 
                          style={styles.overlayBottomImage}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </GestureDetector>
                    
                    {/* Navigation arrows for bottom */}
                    {bottoms.length > 1 && (
                      <View style={styles.navigationRow}>
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => navigateBottom('prev')}
                        >
                          <Icon name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.navButton}
                          onPress={() => navigateBottom('next')}
                        >
                          <Icon name="chevron-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Camera Action Buttons */}
              <View style={styles.cameraActionsContainer}>
                <TouchableOpacity 
                  style={styles.resetButton}
                  onPress={resetGestures}
                >
                  <Icon name="refresh" size={20} color="#fff" />
                  <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.flipButton}
                  onPress={toggleCameraFacing}
                >
                  <Icon name="camera-reverse" size={24} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.captureButton}
                  onPress={capturePhoto}
                >
                  <Icon name="camera" size={28} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Bottom Controls */}
              <View style={styles.cameraFooter}>
                <TouchableOpacity
                  style={styles.toggleCameraButton}
                  onPress={toggleCamera}
                >
                  <Icon name="camera-reverse-outline" size={24} color="#fff" />
                  <Text style={styles.toggleCameraText}>Turn Off Camera</Text>
                </TouchableOpacity>
              </View>
            </CameraView>
          </View>

          {/* Photo Preview Modal */}
          {showPreview && capturedPhoto && (
            <View style={styles.previewModal}>
              <View style={styles.previewContainer}>
                <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />
                
                {/* Overlay the clothes on the preview */}
                <View style={styles.previewOverlay}>
                  {selectedTop && (
                    <Image 
                      source={{ uri: processedImages[selectedTop.id] || selectedTop.url }} 
                      style={[
                        styles.previewClothes, 
                        { 
                          top: '15%',
                          transform: [
                            { scale: capturedTransforms.topScale },
                            { translateX: capturedTransforms.topTranslateX },
                            { translateY: capturedTransforms.topTranslateY },
                          ]
                        }
                      ]}
                      resizeMode="contain"
                    />
                  )}
                  {selectedBottom && (
                    <Image 
                      source={{ uri: processedImages[selectedBottom.id] || selectedBottom.url }} 
                      style={[
                        styles.previewClothes, 
                        { 
                          bottom: '15%',
                          transform: [
                            { scale: capturedTransforms.bottomScale },
                            { translateX: capturedTransforms.bottomTranslateX },
                            { translateY: capturedTransforms.bottomTranslateY },
                          ]
                        }
                      ]}
                      resizeMode="contain"
                    />
                  )}
                </View>

                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.discardButton} onPress={discardPhoto}>
                    <Icon name="close-circle" size={24} color="#fff" />
                    <Text style={styles.previewButtonText}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={savePhotoToGallery}>
                    <Icon name="checkmark-circle" size={24} color="#fff" />
                    <Text style={styles.previewButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // Camera OFF - Show outfit matching interface
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Virtual Try-On</Text>
        <TouchableOpacity onPress={toggleCamera}>
          <Icon name="camera" size={24} color={colors.dark} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Camera Toggle Section */}
        <View style={styles.cameraToggleSection}>
          <TouchableOpacity 
            style={styles.cameraToggleButton}
            onPress={toggleCamera}
          >
            <Icon name="camera-outline" size={32} color={colors.accent} />
            <Text style={styles.cameraToggleText}>Turn On Camera</Text>
            <Text style={styles.cameraToggleSubtext}>See yourself in the mirror</Text>
          </TouchableOpacity>
        </View>

        {/* Outfit Display - Mirror View */}
        <View style={styles.mirrorContainer}>
          <Text style={styles.sectionTitle}>Your Virtual Closet</Text>
          
          <View style={styles.outfitDisplay}>
            {/* Top */}
            <View style={styles.outfitSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.outfitLabel}>TOP</Text>
                {tops.length > 0 && (
                  <Text style={styles.countText}>{currentTopIndex + 1} / {tops.length}</Text>
                )}
              </View>
              <View style={styles.outfitItemFrame}>
                {selectedTop ? (
                  <>
                    <Image 
                      source={{ uri: processedImages[selectedTop.id] || selectedTop.url }} 
                      style={styles.outfitItemImage} 
                    />
                    {loadingBg[selectedTop.id] && (
                      <View style={styles.loadingOverlay}>
                        <Text style={styles.loadingText}>Processing...</Text>
                      </View>
                    )}
                    {/* Navigation Controls */}
                    {tops.length > 1 && (
                      <View style={styles.itemNavigation}>
                        <TouchableOpacity 
                          style={styles.navArrow}
                          onPress={() => navigateTop('prev')}
                        >
                          <Icon name="chevron-back" size={32} color={colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.navArrow}
                          onPress={() => navigateTop('next')}
                        >
                          <Icon name="chevron-forward" size={32} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.outfitItemPlaceholder}>
                    <Icon name="shirt-outline" size={48} color={colors.gray} />
                    <Text style={styles.placeholderText}>No tops available</Text>
                    <Text style={styles.placeholderSubtext}>Add clothing items marked as &quot;Top&quot;</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Bottom */}
            <View style={styles.outfitSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.outfitLabel}>BOTTOM</Text>
                {bottoms.length > 0 && (
                  <Text style={styles.countText}>{currentBottomIndex + 1} / {bottoms.length}</Text>
                )}
              </View>
              <View style={styles.outfitItemFrame}>
                {selectedBottom ? (
                  <>
                    <Image 
                      source={{ uri: processedImages[selectedBottom.id] || selectedBottom.url }} 
                      style={styles.outfitItemImage} 
                    />
                    {loadingBg[selectedBottom.id] && (
                      <View style={styles.loadingOverlay}>
                        <Text style={styles.loadingText}>Processing...</Text>
                      </View>
                    )}
                    {/* Navigation Controls */}
                    {bottoms.length > 1 && (
                      <View style={styles.itemNavigation}>
                        <TouchableOpacity 
                          style={styles.navArrow}
                          onPress={() => navigateBottom('prev')}
                        >
                          <Icon name="chevron-back" size={32} color={colors.accent} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.navArrow}
                          onPress={() => navigateBottom('next')}
                        >
                          <Icon name="chevron-forward" size={32} color={colors.accent} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.outfitItemPlaceholder}>
                    <Icon name="man-outline" size={48} color={colors.gray} />
                    <Text style={styles.placeholderText}>No bottoms available</Text>
                    <Text style={styles.placeholderSubtext}>Add clothing items marked as &quot;Bottom&quot;</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* AI Suggestions Section */}
        <View style={styles.suggestionsContainerOff}>
          <Text style={styles.suggestionsTitle}>
            AI Suggested
          </Text>
          {loadingSuggestions ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading suggestions...</Text>
            </View>
          ) : suggestedItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.placeholderText}>No suggestions available</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.suggestionsScroll}
            >
              {suggestedItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionClick(item)}
                >
                  <Image source={{ uri: item.url }} style={styles.suggestionImage} />
                  <View style={styles.suggestionInfo}>
                    <TouchableOpacity onPress={() => navigateToUserProfile(item)}>
                      <Text style={styles.suggestionUsername}>@{item.userName}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigateToPostDetails(item)}>
                      <Text style={styles.suggestionViewPost}>View Post</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to use:</Text>
          <View style={styles.instructionItem}>
            <Icon name="hand-left-outline" size={20} color={colors.accent} />
            <Text style={styles.instructionText}>
              Use arrow buttons to navigate through tops and bottoms
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Icon name="camera" size={20} color={colors.accent} />
            <Text style={styles.instructionText}>
              Turn on camera to see clothes overlay on yourself - pinch to zoom, drag to position
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Icon name="heart-outline" size={20} color={colors.accent} />
            <Text style={styles.instructionText}>
              Save your favorite outfit combinations
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {(selectedTop || selectedBottom) && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={() => {
                alert('Outfit saved to favorites!');
              }}
            >
              <Icon name="heart" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>Save This Outfit</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondary,
  },
  cameraContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: fonts.header,
    color: colors.dark,
  },
  scrollView: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  cameraControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  toggleCameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 30,
  },
  toggleCameraText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  cameraToggleSection: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cameraToggleButton: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#f0f8f4',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
  },
  cameraToggleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.accent,
    marginTop: spacing.sm,
  },
  cameraToggleSubtext: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 4,
  },
  mirrorContainer: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  outfitDisplay: {
    gap: spacing.md,
  },
  outfitSection: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  outfitLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.gray,
    letterSpacing: 1,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  outfitItemFrame: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
    borderWidth: 2,
    borderColor: colors.accent,
    position: 'relative',
  },
  itemNavigation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    pointerEvents: 'box-none',
  },
  navArrow: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '600',
  },
  clothesOverlay: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 120,
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  topOverlayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  bottomOverlayContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  gestureContainer: {
    width: width * 0.8,
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTopImage: {
    width: '100%',
    height: '100%',
  },
  overlayBottomImage: {
    width: '100%',
    height: '100%',
  },
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: width * 0.7,
    marginTop: spacing.sm,
  },
  navButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 25,
    padding: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  resetButtonContainer: {
    position: 'absolute',
    top: 110,
    right: 20,
    zIndex: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    gap: spacing.xs,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  outfitItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  outfitItemPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.gray,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  placeholderSubtext: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 4,
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: colors.dark,
    lineHeight: 20,
  },
  actionsContainer: {
    backgroundColor: '#fff',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cameraActionsContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  flipButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    backgroundColor: colors.accent,
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  suggestionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: 180,
  },
  suggestionsContainerOff: {
    backgroundColor: '#fff',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  suggestionsScroll: {
    flexDirection: 'row',
  },
  suggestionItem: {
    marginRight: spacing.md,
    alignItems: 'center',
    width: 100,
  },
  suggestionImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.lightGray,
  },
  suggestionInfo: {
    marginTop: spacing.xs,
    width: 100,
    alignItems: 'center',
  },
  suggestionUsername: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    textAlign: 'center',
    numberOfLines: 1,
    width: 100,
  },
  suggestionViewPost: {
    fontSize: 10,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 2,
    paddingVertical: 4,
    paddingHorizontal: 8,
    textDecorationLine: 'underline',
    width: 100,
  },
  previewModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 1000,
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClothes: {
    position: 'absolute',
    width: width * 1.2,
    height: '40%',
  },
  previewActions: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: spacing.xl,
  },
  discardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,0,0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    gap: spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,200,0,0.8)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    gap: spacing.xs,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});