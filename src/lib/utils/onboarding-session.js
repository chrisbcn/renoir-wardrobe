/**
 * Onboarding Session Manager
 * Manages temporary wardrobe data during the onboarding process
 */

export class OnboardingSession {
  constructor(sessionId = null) {
    this.sessionId = sessionId || this.generateSessionId();
    this.items = [];
    this.uploadMethods = {
      cameraRoll: { used: false, itemCount: 0 },
      social: { connected: [], itemCount: 0 },
      receipt: { used: false, itemCount: 0 }
    };
    this.progress = {
      currentPhase: 'method_selection',
      totalItems: 0,
      targetItems: 5,
      canProceed: false
    };
    this.createdAt = new Date();
    this.lastUpdated = new Date();
  }

  /**
   * Add items to the onboarding session
   * @param {Array} items - Array of analyzed items
   * @param {string} method - Upload method used
   */
  async addItems(items, method = 'unknown') {
    console.log(`📦 Adding ${items.length} items to session ${this.sessionId} via ${method}`);
    
    // Add items to the session
    this.items.push(...items);
    
    // Update method tracking
    this.updateMethodUsage(method, items.length);
    
    // Update progress
    this.updateProgress();
    
    // Update timestamp
    this.lastUpdated = new Date();
    
    console.log(`✅ Session now has ${this.items.length} items, can proceed: ${this.progress.canProceed}`);
    
    return {
      success: true,
      sessionId: this.sessionId,
      totalItems: this.items.length,
      progress: this.progress
    };
  }

  /**
   * Get current session progress
   */
  getProgress() {
    return {
      sessionId: this.sessionId,
      totalItems: this.items.length,
      targetItems: this.progress.targetItems,
      canProceed: this.progress.canProceed,
      currentPhase: this.progress.currentPhase,
      methodsUsed: this.uploadMethods,
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Get all items in the session
   */
  getItems() {
    return this.items;
  }

  /**
   * Get items by source/method
   */
  getItemsBySource(source) {
    return this.items.filter(item => item.source === source);
  }

  /**
   * Get items by category
   */
  getItemsByCategory(category) {
    return this.items.filter(item => item.category === category);
  }

  /**
   * Update an item in the session
   */
  updateItem(itemId, updates) {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error(`Item ${itemId} not found in session`);
    }
    
    // Update the item
    this.items[itemIndex] = {
      ...this.items[itemIndex],
      ...updates,
      metadata: {
        ...this.items[itemIndex].metadata,
        ...updates.metadata,
        lastUpdated: new Date().toISOString()
      }
    };
    
    this.lastUpdated = new Date();
    
    return this.items[itemIndex];
  }

  /**
   * Remove an item from the session
   */
  removeItem(itemId) {
    const itemIndex = this.items.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      throw new Error(`Item ${itemId} not found in session`);
    }
    
    const removedItem = this.items.splice(itemIndex, 1)[0];
    
    // Update method counts
    this.updateMethodUsage(removedItem.source, -1);
    
    // Update progress
    this.updateProgress();
    
    this.lastUpdated = new Date();
    
    return removedItem;
  }

  /**
   * Clear all items from the session
   */
  clearItems() {
    this.items = [];
    this.uploadMethods = {
      cameraRoll: { used: false, itemCount: 0 },
      social: { connected: [], itemCount: 0 },
      receipt: { used: false, itemCount: 0 }
    };
    this.updateProgress();
    this.lastUpdated = new Date();
  }

  /**
   * Complete the onboarding session
   * Returns the final wardrobe data
   */
  completeSession() {
    if (!this.progress.canProceed) {
      throw new Error('Cannot complete session - minimum items not reached');
    }
    
    const finalWardrobe = {
      sessionId: this.sessionId,
      items: this.items,
      summary: {
        totalItems: this.items.length,
        methodsUsed: Object.keys(this.uploadMethods).filter(method => 
          this.uploadMethods[method].used || this.uploadMethods[method].itemCount > 0
        ),
        categories: this.getCategoryBreakdown(),
        createdAt: this.createdAt,
        completedAt: new Date()
      }
    };
    
    console.log(`🎉 Onboarding session ${this.sessionId} completed with ${this.items.length} items`);
    
    return finalWardrobe;
  }

  /**
   * Update method usage tracking
   */
  updateMethodUsage(method, itemCount) {
    switch (method) {
      case 'single_image':
      case 'outfit_image':
        this.uploadMethods.cameraRoll.used = true;
        this.uploadMethods.cameraRoll.itemCount += itemCount;
        break;
      case 'social_media':
        this.uploadMethods.social.used = true;
        this.uploadMethods.social.itemCount += itemCount;
        break;
      case 'receipt_image':
      case 'receipt_text':
        this.uploadMethods.receipt.used = true;
        this.uploadMethods.receipt.itemCount += itemCount;
        break;
      default:
        console.warn(`Unknown upload method: ${method}`);
        break;
    }
  }

  /**
   * Update progress tracking
   */
  updateProgress() {
    this.progress.totalItems = this.items.length;
    this.progress.canProceed = this.items.length >= this.progress.targetItems;
    
    // Update phase based on progress
    if (this.items.length === 0) {
      this.progress.currentPhase = 'method_selection';
    } else if (this.items.length < this.progress.targetItems) {
      this.progress.currentPhase = 'adding_items';
    } else {
      this.progress.currentPhase = 'ready_to_complete';
    }
  }

  /**
   * Get category breakdown
   */
  getCategoryBreakdown() {
    const categories = {};
    
    this.items.forEach(item => {
      const category = item.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return categories;
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Export session data for persistence
   */
  export() {
    return {
      sessionId: this.sessionId,
      items: this.items,
      uploadMethods: this.uploadMethods,
      progress: this.progress,
      createdAt: this.createdAt,
      lastUpdated: this.lastUpdated
    };
  }

  /**
   * Import session data from persistence
   */
  import(data) {
    this.sessionId = data.sessionId;
    this.items = data.items || [];
    this.uploadMethods = data.uploadMethods || {
      cameraRoll: { used: false, itemCount: 0 },
      social: { connected: [], itemCount: 0 },
      receipt: { used: false, itemCount: 0 }
    };
    this.progress = data.progress || {
      currentPhase: 'method_selection',
      totalItems: 0,
      targetItems: 5,
      canProceed: false
    };
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
    this.lastUpdated = data.lastUpdated ? new Date(data.lastUpdated) : new Date();
  }
}
