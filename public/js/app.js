        // Data Models
        // Translations object
        const translations = {
            ru: {
                // Header
                'Plant Care Pro': 'Plant Care Pro',
                'GitHub проект': 'GitHub проект',
                'Настройки': 'Настройки',
                'Language / Язык': 'Language / Язык',
                
                // Sidebar
                'Мои растения': 'Мои растения',
                'Добавить растение': 'Добавить растение',
                'Быстрые действия': 'Быстрые действия',
                'Полив сейчас': 'Полив сейчас',
                'События сегодня': 'События сегодня',
                
                // Navigation Tabs
                'Обзор': 'Обзор',
                'Календарь': 'Календарь',
                'История': 'История',
                
                // Settings Modal
                'Настройки приложения': 'Настройки приложения',
                'Общие': 'Общие',
                'Название приложения': 'Название приложения',
                'Интеграция с Telegram': 'Интеграция с Telegram',
                'Включить уведомления в Telegram': 'Включить уведомления в Telegram',
                'Получение уведомлений о поливе и статусе растений': 'Получение уведомлений о поливе и статусе растений',
                'Автоматический бэкап': 'Автоматический бэкап',
                'Регулярная отправка бэкапа данных в чат': 'Регулярная отправка бэкапа данных в чат',
                'Управление данными': 'Управление данными',
                'Экспорт и импорт данных': 'Экспорт и импорт данных',
                'Экспорт файла': 'Экспорт файла',
                'Скачать JSON файл': 'Скачать JSON файл',
                'Импорт из файла': 'Импорт из файла',
                'Загрузить JSON файл': 'Загрузить JSON файл',
                'О приложении': 'О приложении',
                'Версия': 'Версия',
                'Данных растений': 'Данных растений',
                'Записей поливов': 'Записей поливов',
                'Размер данных': 'Размер данных',
                'Исходный код проекта': 'Исходный код проекта',
                'Отмена': 'Отмена',
                'Сохранить настройки': 'Сохранить настройки'
            },
            en: {
                // Header
                'Plant Care Pro': 'Plant Care Pro',
                'GitHub проект': 'GitHub Project',
                'Настройки': 'Settings',
                'Language / Язык': 'Language / Язык',
                
                // Sidebar
                'Мои растения': 'My Plants',
                'Добавить растение': 'Add Plant',
                'Быстрые действия': 'Quick Actions',
                'Полив сейчас': 'Water Now',
                'События сегодня': 'Today\'s Events',
                
                // Navigation Tabs
                'Обзор': 'Overview',
                'Календарь': 'Calendar',
                'История': 'History',
                
                // Settings Modal
                'Настройки приложения': 'Application Settings',
                'Общие': 'General',
                'Название приложения': 'Application Name',
                'Интеграция с Telegram': 'Telegram Integration',
                'Включить уведомления в Telegram': 'Enable Telegram notifications',
                'Получение уведомлений о поливе и статусе растений': 'Receive notifications about watering and plant status',
                'Автоматический бэкап': 'Automatic Backup',
                'Регулярная отправка бэкапа данных в чат': 'Regular backup data sending to chat',
                'Управление данными': 'Data Management',
                'Экспорт и импорт данных': 'Export and Import Data',
                'Экспорт файла': 'Export File',
                'Скачать JSON файл': 'Download JSON file',
                'Импорт из файла': 'Import from File',
                'Загрузить JSON файл': 'Upload JSON file',
                'О приложении': 'About Application',
                'Версия': 'Version',
                'Данных растений': 'Plant Data',
                'Записей поливов': 'Watering Records',
                'Размер данных': 'Data Size',
                'Исходный код проекта': 'Project Source Code',
                'Отмена': 'Cancel',
                'Сохранить настройки': 'Save Settings'
            }
        };

        class PlantCareDatabase {
            constructor() {
                this.dbName = 'plant-care-pro';
                this.dbVersion = 1;
                this.storeName = 'app-state';
                this.stateKey = 'current';
                this.db = null;
                this.engine = 'IndexedDB';
                this.lastSavedAt = null;
            }

            async open() {
                if (!('indexedDB' in window)) {
                    this.engine = 'LocalStorage fallback';
                    return null;
                }

                if (this.db) {
                    return this.db;
                }

                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(this.dbName, this.dbVersion);

                    request.onupgradeneeded = (event) => {
                        const db = event.target.result;
                        if (!db.objectStoreNames.contains(this.storeName)) {
                            db.createObjectStore(this.storeName, { keyPath: 'id' });
                        }
                    };

                    request.onsuccess = (event) => {
                        this.db = event.target.result;
                        this.engine = 'IndexedDB';
                        resolve(this.db);
                    };

                    request.onerror = () => {
                        this.engine = 'LocalStorage fallback';
                        reject(request.error);
                    };
                });
            }

            async load() {
                try {
                    const db = await this.open();
                    if (!db) {
                        return this.loadFromLocalStorage();
                    }

                    const record = await this.readRecord(db);
                    if (record?.data) {
                        this.lastSavedAt = record.updatedAt || null;
                        return record.data;
                    }

                    const migratedData = this.loadFromLocalStorage();
                    if (migratedData) {
                        await this.save(migratedData);
                    }
                    return migratedData;
                } catch (error) {
                    console.warn('IndexedDB недоступна, используется LocalStorage:', error);
                    this.engine = 'LocalStorage fallback';
                    return this.loadFromLocalStorage();
                }
            }

            readRecord(db) {
                return new Promise((resolve, reject) => {
                    const transaction = db.transaction(this.storeName, 'readonly');
                    const store = transaction.objectStore(this.storeName);
                    const request = store.get(this.stateKey);

                    request.onsuccess = () => resolve(request.result || null);
                    request.onerror = () => reject(request.error);
                });
            }

            async save(data) {
                const updatedAt = new Date().toISOString();

                try {
                    const db = await this.open();
                    if (!db) {
                        this.saveToLocalStorage(data, updatedAt);
                        return;
                    }

                    await new Promise((resolve, reject) => {
                        const transaction = db.transaction(this.storeName, 'readwrite');
                        const store = transaction.objectStore(this.storeName);
                        const request = store.put({
                            id: this.stateKey,
                            data,
                            updatedAt,
                            schemaVersion: this.dbVersion
                        });

                        request.onsuccess = () => resolve();
                        request.onerror = () => reject(request.error);
                    });

                    this.lastSavedAt = updatedAt;
                    localStorage.setItem('plantCareDataBackup', JSON.stringify({ data, updatedAt }));
                } catch (error) {
                    console.warn('Не удалось сохранить в IndexedDB, используется LocalStorage:', error);
                    this.engine = 'LocalStorage fallback';
                    this.saveToLocalStorage(data, updatedAt);
                }
            }

            loadFromLocalStorage() {
                const savedData = localStorage.getItem('plantCareData');
                if (!savedData) {
                    const backup = localStorage.getItem('plantCareDataBackup');
                    if (!backup) return null;
                    try {
                        const parsedBackup = JSON.parse(backup);
                        this.lastSavedAt = parsedBackup.updatedAt || null;
                        return parsedBackup.data || null;
                    } catch (error) {
                        console.error('Ошибка чтения резервной копии LocalStorage:', error);
                        return null;
                    }
                }

                try {
                    return JSON.parse(savedData);
                } catch (error) {
                    console.error('Ошибка чтения LocalStorage:', error);
                    return null;
                }
            }

            saveToLocalStorage(data, updatedAt = new Date().toISOString()) {
                localStorage.setItem('plantCareData', JSON.stringify(data));
                this.lastSavedAt = updatedAt;
            }

            getStatus() {
                return {
                    engine: this.engine,
                    database: this.dbName,
                    store: this.storeName,
                    lastSavedAt: this.lastSavedAt
                };
            }
        }

        class PlantCareApp {
            constructor() {
                this.storage = new PlantCareDatabase();
                this.data = {
                    plants: {},
                    fertilizers: {},
                    recipes: {},
                    wateringRules: {},
                    singleWaterings: {},
                    wateringHistory: {},
                    lightPhases: {},
                    settings: {
                        currentView: 'dashboard',
                        selectedPlant: null,
                        currentDate: new Date(),
                        language: 'ru'
                    }
                };
                this.currentPlantId = null;
                this.currentMonth = new Date();
                this.currentLanguage = 'ru';
                this.init();
            }

            // Data Management
            async loadData() {
                const storedData = await this.storage.load();
                if (storedData) {
                    this.data = { ...this.data, ...storedData };
                    this.data.settings.currentDate = new Date(this.data.settings.currentDate || new Date());
                    this.currentMonth = new Date(this.data.settings.currentDate);
                }
                this.initializeDefaultData();
                

                
                // Force recreation of light phases for all plants
                this.initializePlantPhases();
                
                // Auto-select first plant if none selected
                const plants = Object.values(this.data.plants);
                if (plants.length > 0 && !this.data.settings.selectedPlant) {
                    this.data.settings.selectedPlant = plants[0].id;
                }
            }



            initializePlantPhases() {
                console.log('Initializing plant phases...');
                console.log('Plants found:', Object.keys(this.data.plants).length);
                console.log('Existing light phases:', Object.keys(this.data.lightPhases || {}).length);
                
                // Ensure lightPhases exists
                if (!this.data.lightPhases) {
                    this.data.lightPhases = {};
                }
                
                // Create light phases for all plants
                Object.values(this.data.plants).forEach(plant => {
                    console.log(`Processing plant: ${plant.name}, plantDate: ${plant.plantDate}`);
                    
                    // Add default growth phases if missing
                    if (!plant.growthPhases) {
                        plant.growthPhases = { 
                            useDates: false,
                            vegetation: 28, 
                            flowering: 63, 
                            drying: 10 
                        };
                        console.log(`Added default growth phases to ${plant.name}`);
                    }
                    
                    // Always recreate phases for plants with plant dates
                    if (plant.plantDate) {
                        console.log(`Creating light phases for plant: ${plant.name}`);
                        this.createPlantLightPhases(plant.id, plant);
                    } else {
                        console.log(`Skipping ${plant.name} - no plant date`);
                    }
                });
                
                // Force save after initialization
                this.saveData();
                
                console.log('Light phases after initialization:', Object.keys(this.data.lightPhases).length);
                Object.values(this.data.lightPhases).forEach(phase => {
                    console.log(`Phase: ${phase.type}, Plant: ${phase.plantId}, Start: ${phase.startDate}, End: ${phase.endDate}`);
                });
            }

            saveData() {
                this.storage.save(this.data);
            }

            initializeDefaultData() {
                // Initialize default settings
                if (!this.data.settings.appTitle) {
                    this.data.settings.appTitle = 'Plant Care Pro';
                }
                if (!this.data.settings.homeAssistant) {
                    this.data.settings.homeAssistant = {
                        enabled: false,
                        url: '',
                        accessToken: '',
                        entityPrefix: 'plant_care'
                    };
                }

                if (!this.data.settings.telegram) {
                    this.data.settings.telegram = {
                        enabled: false,
                        botToken: '',
                        chatId: '',
                        notifications: {
                            wateringReminders: true,
                            phaseChanges: true,
                            dailySummary: false,
                            dailyTime: '09:00'
                        },
                        lastDailySummary: null
                    };
                }

                if (!this.data.settings.backup) {
                    this.data.settings.backup = {
                        autoEnabled: false,
                        frequency: 'weekly',
                        keepFiles: 10,
                        folderHandle: null,
                        lastBackupTime: null
                    };
                }

                // Initialize default fertilizers
                if (Object.keys(this.data.fertilizers).length === 0) {
                    this.data.fertilizers = {
                        'sensi-grow-a': {
                            id: 'sensi-grow-a',
                            name: 'Sensi Coco Grow A',
                            npk: { n: 4, p: 0, k: 0 },
                            microElements: 'Ca, Mg, S, Fe, Mn, Zn, Cu, B, Mo',
                            density: 1.2
                        },
                        'sensi-grow-b': {
                            id: 'sensi-grow-b',
                            name: 'Sensi Coco Grow B',
                            npk: { n: 1, p: 3, k: 6 },
                            microElements: 'Ca, Mg, S, Fe, Mn, Zn, Cu, B, Mo',
                            density: 1.2
                        },
                        'sensi-bloom-a': {
                            id: 'sensi-bloom-a',
                            name: 'Sensi Coco Bloom A',
                            npk: { n: 3, p: 0, k: 0 },
                            microElements: 'Ca, Mg, S, Fe, Mn, Zn, Cu, B, Mo',
                            density: 1.2
                        },
                        'sensi-bloom-b': {
                            id: 'sensi-bloom-b',
                            name: 'Sensi Coco Bloom B',
                            npk: { n: 1, p: 4, k: 7 },
                            microElements: 'Ca, Mg, S, Fe, Mn, Zn, Cu, B, Mo',
                            density: 1.2
                        },
                        'b52': {
                            id: 'b52',
                            name: 'B-52',
                            npk: { n: 2, p: 1, k: 4 },
                            microElements: 'Витамины группы B, аминокислоты',
                            density: 1.1
                        }
                    };

                    // Initialize default recipes
                    this.data.recipes = {
                        'veg-week-1': {
                            id: 'veg-week-1',
                            name: 'Вега 1 неделя',
                            volume: 1,
                            fertilizers: [
                                { fertilizerId: 'sensi-grow-a', dose: 1 },
                                { fertilizerId: 'sensi-grow-b', dose: 1 },
                                { fertilizerId: 'b52', dose: 1 }
                            ]
                        },
                        'veg-week-2': {
                            id: 'veg-week-2',
                            name: 'Вега 2 неделя',
                            volume: 1,
                            fertilizers: [
                                { fertilizerId: 'sensi-grow-a', dose: 2 },
                                { fertilizerId: 'sensi-grow-b', dose: 2 },
                                { fertilizerId: 'b52', dose: 2 }
                            ]
                        },
                        'veg-week-3': {
                            id: 'veg-week-3',
                            name: 'Вега 3 неделя',
                            volume: 1,
                            fertilizers: [
                                { fertilizerId: 'sensi-grow-a', dose: 3 },
                                { fertilizerId: 'sensi-grow-b', dose: 3 },
                                { fertilizerId: 'b52', dose: 2 }
                            ]
                        },
                        'veg-week-4': {
                            id: 'veg-week-4',
                            name: 'Вега 4 неделя',
                            volume: 1,
                            fertilizers: [
                                { fertilizerId: 'sensi-grow-a', dose: 4 },
                                { fertilizerId: 'sensi-grow-b', dose: 4 },
                                { fertilizerId: 'b52', dose: 2 }
                            ]
                        },
                        'bloom-week-1-2': {
                            id: 'bloom-week-1-2',
                            name: 'Цвет 1-2 неделя',
                            volume: 1,
                            fertilizers: [
                                { fertilizerId: 'sensi-bloom-a', dose: 4 },
                                { fertilizerId: 'sensi-bloom-b', dose: 4 }
                            ]
                        },
                        'bloom-week-3-8': {
                            id: 'bloom-week-3-8',
                            name: 'Цвет 3-8 неделя',
                            volume: 1,
                            fertilizers: [
                                { fertilizerId: 'sensi-bloom-a', dose: 4 },
                                { fertilizerId: 'sensi-bloom-b', dose: 4 },
                                { fertilizerId: 'b52', dose: 2 }
                            ]
                        }
                    };
                }
            }

            // Plant Management
            createPlant(plantData) {
                if (!plantData.name || !plantData.plantDate) {
                    throw new Error('Название и дата посадки обязательны для заполнения');
                }

                const id = 'plant-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const plant = {
                    id,
                    name: plantData.name,
                    strain: plantData.strain || '',
                    species: plantData.species || '',
                    substrate: plantData.substrate || '',
                    plantDate: plantData.plantDate,
                    lightOnTime: plantData.lightOnTime || '08:00',
                    image: plantData.image || null,
                    growthPhases: plantData.growthPhases || { 
                        useDates: false,
                        vegetation: 28, 
                        flowering: 63, 
                        drying: 10 
                    },
                    createdAt: new Date()
                };

                console.log('Creating plant:', plant);
                
                // Ensure plants object exists
                if (!this.data.plants) {
                    this.data.plants = {};
                }
                
                this.data.plants[id] = plant;
                console.log('Plant added to data, total plants:', Object.keys(this.data.plants).length);

                return id;
            }

            createPlantLightPhases(plantId, plantData) {
                console.log(`Creating light phases for plant ${plantId}`);
                const plant = this.data.plants[plantId];
                if (!plant || !plant.plantDate) {
                    console.log(`Skipping plant ${plantId} - missing plant or plantDate`);
                    return;
                }

                // Ensure lightPhases object exists
                if (!this.data.lightPhases) {
                    this.data.lightPhases = {};
                }

                const phases = plant.growthPhases || { useDates: false, vegetation: 28, flowering: 63, drying: 10 };
                console.log(`Plant: ${plant.name}, Start date: ${plant.plantDate}, Phases:`, phases);

                // Clear existing phases for this plant
                Object.keys(this.data.lightPhases).forEach(phaseId => {
                    if (this.data.lightPhases[phaseId].plantId === plantId) {
                        console.log(`Removing existing phase: ${phaseId}`);
                        delete this.data.lightPhases[phaseId];
                    }
                });

                if (phases.useDates && phases.vegStartDate && phases.vegEndDate) {
                    // Create phases using specific dates
                    console.log('Creating phases using specific dates');
                    
                    // Vegetation phase
                    if (phases.vegStartDate && phases.vegEndDate) {
                        const vegPhaseId = this.createLightPhase(plantId, {
                            type: 'vegetation',
                            startDate: phases.vegStartDate,
                            endDate: phases.vegEndDate,
                            lightOnTime: plant.lightOnTime || '08:00'
                        });
                        console.log(`Created vegetation phase: ${vegPhaseId} (${phases.vegStartDate} - ${phases.vegEndDate})`);
                    }

                    // Flowering phase
                    if (phases.flowerStartDate && phases.flowerEndDate) {
                        const flowerPhaseId = this.createLightPhase(plantId, {
                            type: 'flowering',
                            startDate: phases.flowerStartDate,
                            endDate: phases.flowerEndDate,
                            lightOnTime: plant.lightOnTime || '08:00'
                        });
                        console.log(`Created flowering phase: ${flowerPhaseId} (${phases.flowerStartDate} - ${phases.flowerEndDate})`);
                    }

                    // Drying phase
                    if (phases.dryStartDate && phases.dryEndDate) {
                        const dryPhaseId = this.createLightPhase(plantId, {
                            type: 'drying',
                            startDate: phases.dryStartDate,
                            endDate: phases.dryEndDate,
                            lightOnTime: plant.lightOnTime || '08:00'
                        });
                        console.log(`Created drying phase: ${dryPhaseId} (${phases.dryStartDate} - ${phases.dryEndDate})`);
                    }
                } else {
                    // Create phases using durations (default mode)
                    console.log('Creating phases using durations');
                    const startDate = new Date(plant.plantDate);
                    const vegDuration = phases.vegetation || 28;
                    const flowerDuration = phases.flowering || 63;
                    const dryDuration = phases.drying || 10;

                    // Create vegetation phase
                    const vegEndDate = new Date(startDate);
                    vegEndDate.setDate(startDate.getDate() + vegDuration - 1);
                    
                    const vegPhaseId = this.createLightPhase(plantId, {
                        type: 'vegetation',
                        startDate: plant.plantDate,
                        endDate: vegEndDate.toISOString().split('T')[0],
                        lightOnTime: plant.lightOnTime || '08:00'
                    });
                    console.log(`Created vegetation phase: ${vegPhaseId} (${plant.plantDate} - ${vegEndDate.toISOString().split('T')[0]})`);

                    // Create flowering phase
                    const flowerStartDate = new Date(vegEndDate);
                    flowerStartDate.setDate(vegEndDate.getDate() + 1);
                    const flowerEndDate = new Date(flowerStartDate);
                    flowerEndDate.setDate(flowerStartDate.getDate() + flowerDuration - 1);
                    
                    const flowerPhaseId = this.createLightPhase(plantId, {
                        type: 'flowering',
                        startDate: flowerStartDate.toISOString().split('T')[0],
                        endDate: flowerEndDate.toISOString().split('T')[0],
                        lightOnTime: plant.lightOnTime || '08:00'
                    });
                    console.log(`Created flowering phase: ${flowerPhaseId} (${flowerStartDate.toISOString().split('T')[0]} - ${flowerEndDate.toISOString().split('T')[0]})`);

                    // Create drying phase
                    const dryStartDate = new Date(flowerEndDate);
                    dryStartDate.setDate(flowerEndDate.getDate() + 1);
                    const dryEndDate = new Date(dryStartDate);
                    dryEndDate.setDate(dryStartDate.getDate() + dryDuration - 1);
                    
                    const dryPhaseId = this.createLightPhase(plantId, {
                        type: 'drying',
                        startDate: dryStartDate.toISOString().split('T')[0],
                        endDate: dryEndDate.toISOString().split('T')[0],
                        lightOnTime: plant.lightOnTime || '08:00'
                    });
                    console.log(`Created drying phase: ${dryPhaseId} (${dryStartDate.toISOString().split('T')[0]} - ${dryEndDate.toISOString().split('T')[0]})`);
                }

                console.log(`Finished creating phases for ${plant.name}. Total phases: ${Object.keys(this.data.lightPhases).length}`);
                
                // Force save and refresh UI
                this.saveData();
            }

            updatePlantLightPhases(plantId, plantData) {
                const plant = this.data.plants[plantId];
                if (!plant) return;

                // Update growth phases in plant data
                if (plantData.growthPhases) {
                    plant.growthPhases = plantData.growthPhases;
                }

                // Recreate light phases with new durations
                this.createPlantLightPhases(plantId, plantData);
            }

            updatePlant(id, updates) {
                if (this.data.plants[id]) {
                    this.data.plants[id] = { ...this.data.plants[id], ...updates };
                    this.saveData();
                }
            }

            deletePlant(id) {
                delete this.data.plants[id];
                // Clean up related data
                Object.keys(this.data.lightPhases).forEach(phaseId => {
                    if (this.data.lightPhases[phaseId].plantId === id) {
                        delete this.data.lightPhases[phaseId];
                    }
                });
                Object.keys(this.data.wateringRules).forEach(ruleId => {
                    if (this.data.wateringRules[ruleId].plantId === id) {
                        delete this.data.wateringRules[ruleId];
                    }
                });
                this.saveData();
            }

            // Light Phase Management
            createLightPhase(plantId, phaseData) {
                const id = 'phase-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                const lightSchedules = {
                    'vegetation': { on: 18, off: 6 },
                    'flowering': { on: 12, off: 12 },
                    'drying': { on: 0, off: 24 },
                    'harvest': { on: 0, off: 24 }
                };

                const schedule = lightSchedules[phaseData.type] || lightSchedules['vegetation'];
                const lightOnTime = phaseData.lightOnTime || this.data.plants[plantId]?.lightOnTime || '08:00';
                const lightOffTime = this.calculateLightOffTime(lightOnTime, schedule.on);

                const phase = {
                    id,
                    plantId,
                    type: phaseData.type,
                    startDate: phaseData.startDate,
                    endDate: phaseData.endDate || null,
                    lightOnTime,
                    lightOffTime,
                    schedule
                };

                console.log(`Creating light phase:`, phase);
                this.data.lightPhases[id] = phase;
                
                return id;
            }

            calculateLightOffTime(lightOnTime, hoursOn) {
                const [hours, minutes] = lightOnTime.split(':').map(Number);
                const offTime = new Date();
                offTime.setHours(hours + hoursOn, minutes, 0, 0);
                if (offTime.getDate() !== new Date().setHours(hours, minutes, 0, 0)) {
                    offTime.setDate(offTime.getDate() + 1);
                }
                return offTime.toTimeString().slice(0, 5);
            }

            // Watering Status Management
            needsWatering(plantId) {
                const currentDate = new Date();
                const threeDaysAgo = new Date(currentDate.getTime() - 3 * 24 * 60 * 60 * 1000);
                
                // Find the last watering for this plant
                const plantWaterings = Object.values(this.data.wateringHistory)
                    .filter(watering => watering.plantIds.includes(plantId))
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                
                if (plantWaterings.length === 0) {
                    // No waterings recorded - show warning if plant is older than 3 days
                    const plant = this.data.plants[plantId];
                    if (plant) {
                        const plantDate = new Date(plant.plantDate);
                        return currentDate - plantDate > 3 * 24 * 60 * 60 * 1000;
                    }
                    return false;
                }
                
                const lastWatering = new Date(plantWaterings[0].date);
                return lastWatering < threeDaysAgo;
            }

            getDaysSinceLastWatering(plantId) {
                const currentDate = new Date();
                const plantWaterings = Object.values(this.data.wateringHistory)
                    .filter(watering => watering.plantIds.includes(plantId))
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                
                if (plantWaterings.length === 0) {
                    const plant = this.data.plants[plantId];
                    if (plant) {
                        const plantDate = new Date(plant.plantDate);
                        return Math.floor((currentDate - plantDate) / (1000 * 60 * 60 * 24));
                    }
                    return 0;
                }
                
                const lastWatering = new Date(plantWaterings[0].date);
                return Math.floor((currentDate - lastWatering) / (1000 * 60 * 60 * 24));
            }

            quickWaterPlant(plantId) {
                const plant = this.data.plants[plantId];
                if (!plant) {
                    alert('Растение не найдено');
                    return;
                }
                
                // Open watering modal with this plant pre-selected
                this.showWateringModal();
                
                // Wait for modal to render, then select only this plant
                setTimeout(() => {
                    // Uncheck all plants first
                    document.querySelectorAll('input[name="selected-plants"]').forEach(checkbox => {
                        checkbox.checked = checkbox.value === plantId;
                    });
                    this.updateWateringCalculation();
                }, 100);
            }

            // Calendar and Day Calculations
            getDaysSincePlanting(plantId, date) {
                const plant = this.data.plants[plantId];
                if (!plant) return 0;
                const plantDate = new Date(plant.plantDate);
                const targetDate = new Date(date);
                const diffTime = targetDate - plantDate;
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            getCurrentLightPhase(plantId, date) {
                if (!this.data.lightPhases) {
                    console.log('No light phases data');
                    return null;
                }
                
                const phases = Object.values(this.data.lightPhases)
                    .filter(phase => phase.plantId === plantId)
                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

                console.log(`Found ${phases.length} phases for plant ${plantId}`);
                phases.forEach(p => console.log(`  Phase: ${p.type}, ${p.startDate} - ${p.endDate}`));

                if (phases.length === 0) {
                    return null;
                }

                const targetDate = new Date(date);
                targetDate.setHours(0, 0, 0, 0);
                console.log(`Looking for phase on date: ${targetDate.toISOString().split('T')[0]}`);

                for (let phase of phases) {
                    const phaseStart = new Date(phase.startDate);
                    phaseStart.setHours(0, 0, 0, 0);
                    
                    const phaseEnd = phase.endDate ? new Date(phase.endDate) : new Date('2099-12-31');
                    phaseEnd.setHours(23, 59, 59, 999);
                    
                    console.log(`  Checking phase ${phase.type}: ${phaseStart.toISOString().split('T')[0]} - ${phaseEnd.toISOString().split('T')[0]}`);
                    
                    if (targetDate >= phaseStart && targetDate <= phaseEnd) {
                        console.log(`  Found matching phase: ${phase.type}`);
                        return phase;
                    }
                }
                console.log('  No matching phase found');
                return null;
            }

            // UI Management
            async init() {
                await this.loadData();
                this.initLanguage();
                this.initEventListeners();
                this.renderUI();
                
                // Setup auto backup if enabled
                setTimeout(() => {
                    if (this.data.settings.backup?.autoEnabled) {
                        this.setupAutoBackup();
                    }
                }, 2000); // Wait 2 seconds for app to fully load
            }

            initEventListeners() {
                // Tab switching
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const tabId = e.currentTarget.id.replace('tab-', '');
                        this.switchTab(tabId);
                    });
                });

                // Plant management
                document.getElementById('add-plant-btn').addEventListener('click', () => this.showPlantModal());
                document.getElementById('plant-form').addEventListener('submit', (e) => this.handlePlantForm(e));
                document.getElementById('plant-cancel-btn').addEventListener('click', () => this.hidePlantModal());

                // Fertilizer management
                document.getElementById('add-fertilizer-btn').addEventListener('click', () => this.showFertilizerModal());
                document.getElementById('fertilizer-form').addEventListener('submit', (e) => this.handleFertilizerForm(e));
                document.getElementById('fertilizer-cancel-btn').addEventListener('click', () => this.hideFertilizerModal());

                // Recipe management
                document.getElementById('add-recipe-btn').addEventListener('click', () => this.showRecipeModal());
                document.getElementById('recipe-form').addEventListener('submit', (e) => this.handleRecipeForm(e));
                document.getElementById('recipe-cancel-btn').addEventListener('click', () => this.hideRecipeModal());

                // Watering management
                document.getElementById('watering-form').addEventListener('submit', (e) => this.handleWateringForm(e));
                document.getElementById('watering-cancel-btn').addEventListener('click', () => this.hideWateringModal());
                document.getElementById('auto-recipe-btn').addEventListener('click', () => this.autoSelectRecipe());

                // Calendar navigation
                document.getElementById('prev-month-btn').addEventListener('click', () => this.previousMonth());
                document.getElementById('next-month-btn').addEventListener('click', () => this.nextMonth());
                document.getElementById('today-btn').addEventListener('click', () => this.goToToday());

                // Quick actions
                document.getElementById('quick-water-btn').addEventListener('click', () => this.quickWater());
                
                // Settings management
                document.getElementById('settings-btn').addEventListener('click', () => this.showSettingsModal());
                document.getElementById('settings-form').addEventListener('submit', (e) => this.handleSettingsForm(e));
                document.getElementById('settings-cancel-btn').addEventListener('click', () => this.hideSettingsModal());
                document.getElementById('settings-ha-enabled').addEventListener('change', (e) => this.toggleHomeAssistantSettings(e.target.checked));
                document.getElementById('test-ha-connection').addEventListener('click', () => this.testHomeAssistantConnection());
                document.getElementById('sync-ha-entities').addEventListener('click', () => this.syncHomeAssistantEntities());

                // Telegram integration
                document.getElementById('settings-telegram-enabled').addEventListener('change', (e) => this.toggleTelegramSettings(e.target.checked));
                document.getElementById('settings-telegram-daily-summary').addEventListener('change', (e) => this.toggleDailySummaryTime(e.target.checked));
                document.getElementById('settings-telegram-auto-backup').addEventListener('change', (e) => this.toggleTelegramBackupSettings(e.target.checked));
                document.getElementById('test-telegram-connection').addEventListener('click', () => this.testTelegramConnection());
                document.getElementById('get-telegram-chat-id').addEventListener('click', () => this.getTelegramChatId());
                document.getElementById('send-plant-status').addEventListener('click', () => this.sendPlantStatusToTelegram());
                document.getElementById('send-backup-telegram').addEventListener('click', () => this.sendBackupToTelegram());

                document.getElementById('export-data-btn').addEventListener('click', () => this.exportData());
                document.getElementById('import-data-btn').addEventListener('click', () => this.importData());
                
                // Add config.txt handlers with delay to ensure elements exist
                setTimeout(() => {
                    const backupToConfigBtn = document.getElementById('backup-to-config-btn');
                    const restoreFromConfigBtn = document.getElementById('restore-from-config-btn');
                    
                    if (backupToConfigBtn) {
                        backupToConfigBtn.addEventListener('click', () => this.backupToConfigFile());
                    }
                    if (restoreFromConfigBtn) {
                        restoreFromConfigBtn.addEventListener('click', () => this.restoreFromConfigFile());
                    }
                }, 100);
                document.getElementById('data-import-input').addEventListener('change', (e) => this.handleDataImport(e));

                // Language switching
                document.getElementById('language-btn').addEventListener('click', () => this.toggleLanguageDropdown());
                document.getElementById('lang-ru').addEventListener('click', () => this.setLanguage('ru'));
                document.getElementById('lang-en').addEventListener('click', () => this.setLanguage('en'));
                
                // Close language dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    const dropdown = document.getElementById('language-dropdown');
                    const btn = document.getElementById('language-btn');
                    if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                        dropdown.classList.add('hidden');
                    }
                });

                // Mobile menu management
                document.getElementById('mobile-menu-btn').addEventListener('click', () => this.toggleMobileMenu());
                document.getElementById('mobile-overlay').addEventListener('click', () => this.hideMobileMenu());
            }

            switchTab(tabName) {
                // Update tab buttons
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.remove('bg-primary', 'text-darker');
                    btn.classList.add('bg-gray-700', 'hover:bg-gray-600');
                });
                
                const tabButton = document.getElementById(`tab-${tabName}`);
                if (tabButton) {
                    tabButton.classList.remove('bg-gray-700', 'hover:bg-gray-600');
                    tabButton.classList.add('bg-primary', 'text-darker');
                }

                // Update content areas
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.add('hidden');
                });
                
                const contentArea = document.getElementById(`content-${tabName}`);
                if (contentArea) {
                    contentArea.classList.remove('hidden');
                }

                this.data.settings.currentView = tabName;
                this.saveData();

                // Render specific content
                switch (tabName) {
                    case 'dashboard':
                        this.renderDashboard();
                        this.renderPlantCalendars();
                        break;
                    case 'fertilizers':
                        this.renderFertilizers();
                        break;
                    case 'recipes':
                        this.renderRecipes();
                        break;
                    case 'history':
                        this.renderWateringHistory();
                        break;
                }
            }

            renderUI() {
                this.updateAppTitle();
                this.renderPlantsList();
                this.switchTab(this.data.settings.currentView);
            }

            updateAppTitle() {
                const titleElement = document.querySelector('header h1');
                if (titleElement && this.data.settings.appTitle) {
                    titleElement.textContent = this.data.settings.appTitle;
                }
                
                // Update page title
                document.title = this.data.settings.appTitle || 'Plant Care Pro';
            }

            // Mobile menu management
            toggleMobileMenu() {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                
                if (sidebar.classList.contains('-translate-x-full')) {
                    this.showMobileMenu();
                } else {
                    this.hideMobileMenu();
                }
            }

            showMobileMenu() {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
            }

            hideMobileMenu() {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('mobile-overlay');
                
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            }

            // Language management
            initLanguage() {
                // Load saved language or use default
                this.currentLanguage = this.data.settings.language || 'ru';
                this.updateLanguageDisplay();
                this.applyTranslations();
            }

            toggleLanguageDropdown() {
                const dropdown = document.getElementById('language-dropdown');
                dropdown.classList.toggle('hidden');
            }

            setLanguage(lang) {
                this.currentLanguage = lang;
                this.data.settings.language = lang;
                this.saveData();
                
                this.updateLanguageDisplay();
                this.applyTranslations();
                
                // Hide dropdown
                document.getElementById('language-dropdown').classList.add('hidden');
            }

            updateLanguageDisplay() {
                const currentLangEl = document.getElementById('current-lang');
                if (currentLangEl) {
                    currentLangEl.textContent = this.currentLanguage.toUpperCase();
                }
            }

            translate(key) {
                return translations[this.currentLanguage]?.[key] || key;
            }

            applyTranslations() {
                // Update elements with data-translate attribute
                document.querySelectorAll('[data-translate]').forEach(el => {
                    const key = el.getAttribute('data-translate');
                    const translation = this.translate(key);
                    
                    if (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button')) {
                        el.value = translation;
                    } else if (el.hasAttribute('placeholder')) {
                        el.placeholder = translation;
                    } else if (el.hasAttribute('title')) {
                        el.title = translation;
                    } else {
                        el.textContent = translation;
                    }
                });

                // Force re-render UI components that might have translatable content
                this.renderPlantsList();
                this.renderUI();
            }

            // Image URL loading methods
            switchPlantUploadMode(mode) {
                const fileBtn = document.getElementById('plant-upload-file-btn');
                const urlBtn = document.getElementById('plant-upload-url-btn');
                const fileUpload = document.getElementById('plant-file-upload');
                const urlUpload = document.getElementById('plant-url-upload');

                if (mode === 'file') {
                    fileBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    urlBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    fileUpload.classList.remove('hidden');
                    urlUpload.classList.add('hidden');
                } else {
                    fileBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    urlBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    fileUpload.classList.add('hidden');
                    urlUpload.classList.remove('hidden');
                }
            }

            switchFertilizerUploadMode(mode) {
                const fileBtn = document.getElementById('fertilizer-upload-file-btn');
                const urlBtn = document.getElementById('fertilizer-upload-url-btn');
                const fileUpload = document.getElementById('fertilizer-file-upload');
                const urlUpload = document.getElementById('fertilizer-url-upload');

                if (mode === 'file') {
                    fileBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    urlBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    fileUpload.classList.remove('hidden');
                    urlUpload.classList.add('hidden');
                } else {
                    fileBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    urlBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    fileUpload.classList.add('hidden');
                    urlUpload.classList.remove('hidden');
                }
            }

            // Вспомогательная функция для проверки валидности URL изображения
            isImageUrl(url) {
                try {
                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname.toLowerCase();
                    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
                    
                    // Проверяем расширение файла
                    const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
                    
                    // Некоторые сервисы не показывают расширение в URL, но это всё равно изображения
                    const imageHosts = ['i.imgur.com', 'cdn.discordapp.com', 'images.unsplash.com', 
                                      'i.postimg.cc', 'ibb.co', 'pasteboard.co'];
                    const isImageHost = imageHosts.some(host => urlObj.hostname.includes(host));
                    
                    return hasImageExtension || isImageHost;
                } catch {
                    return false;
                }
            }

            // Вспомогательная функция для нормализации URL
            normalizeImageUrl(url) {
                try {
                    let normalizedUrl = url.trim();
                    
                    // Обработка специальных сервисов
                    if (normalizedUrl.includes('drive.google.com')) {
                        // Google Drive: конвертируем в прямую ссылку
                        const fileIdMatch = normalizedUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
                        if (fileIdMatch) {
                            normalizedUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
                        }
                    } else if (normalizedUrl.includes('dropbox.com')) {
                        // Dropbox: заменяем dl=0 на dl=1
                        normalizedUrl = normalizedUrl.replace(/[?&]dl=0/, '?dl=1');
                        if (!normalizedUrl.includes('dl=1')) {
                            normalizedUrl += normalizedUrl.includes('?') ? '&dl=1' : '?dl=1';
                        }
                    }
                    
                    return normalizedUrl;
                } catch {
                    return url;
                }
            }

            async loadPlantImageFromUrl() {
                const imageUrlInput = document.getElementById('plant-image-url');
                const previewContainer = document.getElementById('plant-image-preview');
                const previewImg = document.getElementById('plant-preview-img');
                const loadBtn = document.getElementById('load-plant-image-url');
                
                const originalUrl = imageUrlInput.value.trim();
                if (!originalUrl) {
                    alert('Введите URL изображения');
                    return;
                }

                // Normalize and validate URL
                const url = this.normalizeImageUrl(originalUrl);
                
                try {
                    new URL(url);
                } catch {
                    alert('Некорректный URL. Проверьте правильность введенной ссылки.');
                    return;
                }

                // Check if URL looks like an image
                if (!this.isImageUrl(url)) {
                    const confirmMessage = 'URL не похож на прямую ссылку на изображение.\n\n' +
                        'Для лучшей совместимости используйте URL, заканчивающиеся на:\n' +
                        '.jpg, .png, .webp, .gif\n\n' +
                        'Всё равно попробовать загрузить?';
                    
                    if (!confirm(confirmMessage)) {
                        return;
                    }
                }

                // Show loading state
                loadBtn.textContent = 'Загрузка...';
                loadBtn.disabled = true;

                try {
                    // Try to load image without CORS first (most permissive)
                    const testImg = new Image();
                    
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout: изображение не загрузилось за 10 секунд'));
                        }, 10000);
                        
                        testImg.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        
                        testImg.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('Не удается загрузить изображение'));
                        };
                        
                        testImg.src = url;
                    });

                    // If successful, show preview
                    previewImg.src = url;
                    previewContainer.classList.remove('hidden');
                    
                    // Clear file input when URL is loaded
                    document.getElementById('plant-image').value = '';
                    
                    this.showNotification('✅ Изображение загружено успешно', 'success');
                    
                } catch (error) {
                    console.log('Image load error:', error);
                    
                    let errorMessage = 'Не удалось загрузить изображение по указанной ссылке.\n\n';
                    
                    if (error.message.includes('Timeout')) {
                        errorMessage += '⏱️ Превышено время ожидания загрузки.\n';
                    } else {
                        errorMessage += '❌ Ошибка загрузки изображения.\n';
                    }
                    
                    errorMessage += '\n💡 Возможные причины:\n';
                    errorMessage += '• URL не является прямой ссылкой на изображение\n';
                    errorMessage += '• Сервер блокирует загрузку (CORS)\n';
                    errorMessage += '• Изображение недоступно или удалено\n';
                    errorMessage += '• Медленное интернет-соединение\n\n';
                    errorMessage += '🔧 Решения:\n';
                    errorMessage += '• Используйте прямые ссылки (.jpg, .png, .webp)\n';
                    errorMessage += '• Попробуйте другой хостинг изображений\n';
                    errorMessage += '• Скачайте и загрузите файл через вкладку "Файл"';
                    
                    alert(errorMessage);
                } finally {
                    // Restore button state
                    loadBtn.textContent = 'Загрузить по ссылке';
                    loadBtn.disabled = false;
                }
            }

            async loadFertilizerImageFromUrl() {
                const imageUrlInput = document.getElementById('fertilizer-image-url');
                const previewContainer = document.getElementById('fertilizer-image-preview');
                const previewImg = document.getElementById('fertilizer-preview-img');
                const loadBtn = document.getElementById('load-fertilizer-image-url');
                
                const originalUrl = imageUrlInput.value.trim();
                if (!originalUrl) {
                    alert('Введите URL изображения');
                    return;
                }

                // Normalize and validate URL
                const url = this.normalizeImageUrl(originalUrl);
                
                try {
                    new URL(url);
                } catch {
                    alert('Некорректный URL. Проверьте правильность введенной ссылки.');
                    return;
                }

                // Check if URL looks like an image
                if (!this.isImageUrl(url)) {
                    const confirmMessage = 'URL не похож на прямую ссылку на изображение.\n\n' +
                        'Для лучшей совместимости используйте URL, заканчивающиеся на:\n' +
                        '.jpg, .png, .webp, .gif\n\n' +
                        'Всё равно попробовать загрузить?';
                    
                    if (!confirm(confirmMessage)) {
                        return;
                    }
                }

                // Show loading state
                loadBtn.textContent = 'Загрузка...';
                loadBtn.disabled = true;

                try {
                    // Try to load image without CORS first (most permissive)
                    const testImg = new Image();
                    
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout: изображение не загрузилось за 10 секунд'));
                        }, 10000);
                        
                        testImg.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        
                        testImg.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('Не удается загрузить изображение'));
                        };
                        
                        testImg.src = url;
                    });

                    // If successful, show preview
                    previewImg.src = url;
                    previewContainer.classList.remove('hidden');
                    
                    // Clear file input when URL is loaded
                    document.getElementById('fertilizer-image').value = '';
                    
                    this.showNotification('✅ Изображение загружено успешно', 'success');
                    
                } catch (error) {
                    console.log('Image load error:', error);
                    
                    let errorMessage = 'Не удалось загрузить изображение по указанной ссылке.\n\n';
                    
                    if (error.message.includes('Timeout')) {
                        errorMessage += '⏱️ Превышено время ожидания загрузки.\n';
                    } else {
                        errorMessage += '❌ Ошибка загрузки изображения.\n';
                    }
                    
                    errorMessage += '\n💡 Возможные причины:\n';
                    errorMessage += '• URL не является прямой ссылкой на изображение\n';
                    errorMessage += '• Сервер блокирует загрузку (CORS)\n';
                    errorMessage += '• Изображение недоступно или удалено\n';
                    errorMessage += '• Медленное интернет-соединение\n\n';
                    errorMessage += '🔧 Решения:\n';
                    errorMessage += '• Используйте прямые ссылки (.jpg, .png, .webp)\n';
                    errorMessage += '• Попробуйте другой хостинг изображений\n';
                    errorMessage += '• Скачайте и загрузите файл через вкладку "Файл"';
                    
                    alert(errorMessage);
                } finally {
                    // Restore button state
                    loadBtn.textContent = 'Загрузить по ссылке';
                    loadBtn.disabled = false;
                }
            }

            renderPhaseProgress(plantId, currentPhase) {
                if (!currentPhase) {
                    return `
                        <div class="mt-4 pt-3 border-t border-gray-600">
                            <div class="text-center text-gray-400 text-sm">
                                <svg class="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <div>Фаза роста не определена</div>
                            </div>
                        </div>
                    `;
                }

                const currentDate = new Date();
                const phaseStartDate = new Date(currentPhase.startDate);
                const phaseEndDate = currentPhase.endDate ? new Date(currentPhase.endDate) : null;
                
                if (!phaseEndDate) {
                    return `
                        <div class="mt-4 pt-3 border-t border-gray-600">
                            <div class="text-center text-gray-400 text-sm">
                                <div>Дата окончания фазы не установлена</div>
                            </div>
                        </div>
                    `;
                }

                // Рассчитываем прогресс
                const totalPhaseDays = Math.ceil((phaseEndDate - phaseStartDate) / (1000 * 60 * 60 * 24)) + 1;
                const daysSincePhaseStart = Math.ceil((currentDate - phaseStartDate) / (1000 * 60 * 60 * 24));
                const daysUntilPhaseEnd = Math.ceil((phaseEndDate - currentDate) / (1000 * 60 * 60 * 24));
                const progressPercent = Math.min(100, Math.max(0, (daysSincePhaseStart / totalPhaseDays) * 100));

                // Определяем цвета и иконки для разных фаз
                const phaseInfo = {
                    'vegetation': {
                        color: 'green',
                        bgColor: 'bg-green-600/20',
                        borderColor: 'border-green-400',
                        textColor: 'text-green-400',
                        icon: '🌱',
                        name: 'Вегетация'
                    },
                    'flowering': {
                        color: 'purple', 
                        bgColor: 'bg-purple-600/20',
                        borderColor: 'border-purple-400',
                        textColor: 'text-purple-400',
                        icon: '🌸',
                        name: 'Цветение'
                    },
                    'drying': {
                        color: 'orange',
                        bgColor: 'bg-orange-600/20', 
                        borderColor: 'border-orange-400',
                        textColor: 'text-orange-400',
                        icon: '🍂',
                        name: 'Сушка'
                    }
                };

                const info = phaseInfo[currentPhase.type] || phaseInfo['vegetation'];
                const isPhaseEnding = daysUntilPhaseEnd <= 3;
                const hasPhaseEnded = daysUntilPhaseEnd < 0;

                // Check watering status
                const needsWatering = this.needsWatering(plantId);
                const daysSinceWatering = this.getDaysSinceLastWatering(plantId);

                return `
                    <div class="mt-4 pt-3 border-t border-gray-600">
                        <h4 class="text-xs font-medium text-gray-400 mb-3 flex items-center justify-between">
                            <span>ТЕКУЩАЯ ФАЗА</span>
                            <span class="text-xs ${info.textColor}">${info.icon} ${info.name}</span>
                        </h4>
                        
                        <!-- Watering Alert -->
                        ${needsWatering ? `
                        <div class="mb-4 p-3 bg-red-600/20 border border-red-400/50 rounded-lg">
                            <div class="flex items-center gap-2 mb-2">
                                <svg class="w-5 h-5 text-red-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                </svg>
                                <span class="text-red-400 font-medium text-sm">ТРЕБУЕТСЯ ПОЛИВ!</span>
                            </div>
                            <div class="text-red-300 text-xs">
                                💧 Прошло ${daysSinceWatering} дн. с последнего полива
                            </div>
                            <button onclick="app.quickWaterPlant('${plantId}')" class="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors">
                                Полить сейчас
                            </button>
                        </div>
                        ` : daysSinceWatering <= 1 ? `
                        <div class="mb-4 p-3 bg-green-600/20 border border-green-400/50 rounded-lg">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                                <span class="text-green-400 text-xs font-medium">Недавно полито (${daysSinceWatering} дн. назад)</span>
                            </div>
                        </div>
                        ` : `
                        <div class="mb-4 p-3 bg-gray-700/50 rounded-lg">
                            <div class="flex items-center gap-2">
                                <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                                </svg>
                                <span class="text-gray-300 text-xs">Последний полив: ${daysSinceWatering} дн. назад</span>
                            </div>
                        </div>
                        `}
                        
                        <div class="${info.bgColor} p-3 rounded-lg border-l-4 ${info.borderColor}">
                            <div class="flex justify-between items-center mb-2">
                                <div class="text-sm font-medium ${info.textColor}">
                                    День ${daysSincePhaseStart} из ${totalPhaseDays}
                                </div>
                                <div class="text-xs text-gray-300">
                                    ${progressPercent.toFixed(0)}%
                                </div>
                            </div>
                            
                            <!-- Progress bar -->
                            <div class="w-full bg-gray-700 rounded-full h-2 mb-3">
                                <div class="bg-${info.color}-400 h-2 rounded-full transition-all duration-300" style="width: ${progressPercent}%"></div>
                            </div>
                            
                            <div class="flex justify-between items-center text-xs">
                                <div class="text-gray-300">
                                    Начало: ${phaseStartDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                </div>
                                <div class="text-gray-300">
                                    Конец: ${phaseEndDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
                                </div>
                            </div>
                            
                            <!-- Days remaining -->
                            <div class="mt-3 text-center">
                                ${hasPhaseEnded ? `
                                    <div class="text-red-400 text-sm font-medium">
                                        ⚠️ Фаза завершена ${Math.abs(daysUntilPhaseEnd)} дней назад
                                    </div>
                                ` : daysUntilPhaseEnd === 0 ? `
                                    <div class="text-yellow-400 text-sm font-medium animate-pulse">
                                        🎯 Последний день фазы!
                                    </div>
                                ` : isPhaseEnding ? `
                                    <div class="text-yellow-400 text-sm font-medium">
                                        ⏰ Осталось ${daysUntilPhaseEnd} дн. до завершения
                                    </div>
                                ` : `
                                    <div class="text-gray-300 text-sm">
                                        📅 Осталось <span class="${info.textColor} font-medium">${daysUntilPhaseEnd} дней</span>
                                    </div>
                                `}
                            </div>
                        </div>
                    </div>
                `;
            }

            isPlantActive(plant) {
                const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                if (!currentPhase) return false;
                
                // Растение активно если оно не в фазе сушки или харвеста
                return currentPhase.type === 'vegetation' || currentPhase.type === 'flowering';
            }

            renderPlantsList() {
                const container = document.getElementById('plants-list');
                const plants = Object.values(this.data.plants);
                
                container.innerHTML = '';
                
                plants.forEach(plant => {
                    const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    const phaseText = currentPhase ? this.getPhaseDisplayName(currentPhase.type) : 'Неизвестно';
                    
                    const plantCard = document.createElement('div');
                    const isSelected = plant.id === this.data.settings.selectedPlant;
                    const isActive = this.isPlantActive(plant);
                    // Карточка свернута если: 1) есть выбранное растение И это не оно, ИЛИ 2) растение неактивно И нет выбранного растения
                    const isCollapsed = (this.data.settings.selectedPlant && !isSelected) || (!isActive && !this.data.settings.selectedPlant);
                    
                    plantCard.className = `bg-gray-800 rounded-lg relative overflow-hidden cursor-pointer hover:bg-gray-750 transition-all duration-300 ${isSelected ? 'ring-2 ring-primary bg-primary/10 p-4' : isCollapsed ? 'p-2 opacity-75 hover:opacity-100' : 'p-4'}`;
                    plantCard.onclick = () => this.selectPlantFromCard(plant.id);
                    plantCard.setAttribute('data-plant-id', plant.id);
                    
                    // Определяем фоновое изображение
                    const backgroundImage = plant.image || '1nsfSKxFu5LKDqP7zoRtP';
                    const backgroundOpacity = plant.image ? 'opacity-40' : 'opacity-30';
                    
                    if (isCollapsed) {
                        // Проверяем статус полива для предупреждения
                        const needsWatering = this.needsWatering(plant.id);
                        const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                        
                        // Компактная версия карточки
                        plantCard.innerHTML = `
                            <div class="absolute inset-0 bg-cover bg-center ${backgroundOpacity}" style="background-image: url('${backgroundImage}');"></div>
                            <div class="relative z-10 flex items-center justify-between">
                                <div class="flex items-center gap-3 min-w-0 flex-1">
                                    <div class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0 relative">
                                        ${this.getPhaseIcon(currentPhase?.type || 'unknown')}
                                        ${needsWatering ? `
                                        <div class="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center animate-pulse" title="Требуется полив (${daysSinceWatering} дн. назад)">
                                            <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                                            </svg>
                                        </div>
                                        ` : ''}
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <h3 class="font-medium text-sm truncate ${needsWatering ? 'text-red-300' : ''}">${plant.name}</h3>
                                        <div class="text-xs text-gray-400 truncate">
                                            День ${daysSince} • ${this.getPhaseShortName(currentPhase?.type || 'unknown')}
                                            ${needsWatering ? ` • ⚠️ ${daysSinceWatering}д без полива` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 ml-2">
                                    ${needsWatering ? `
                                    <button onclick="app.quickWaterPlant('${plant.id}'); event.stopPropagation();" 
                                            class="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors" 
                                            title="Полить сейчас">
                                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                                        </svg>
                                    </button>
                                    ` : ''}
                                </div>
                            </div>
                        `;
                    } else {
                        // Полная версия карточки
                        plantCard.innerHTML = `
                            <div class="absolute inset-0 bg-cover bg-center ${backgroundOpacity}" style="background-image: url('${backgroundImage}');"></div>
                            <div class="relative z-10">
                                <h3 class="font-semibold text-lg mb-2">${plant.name}</h3>
                                <div class="flex flex-col gap-1 text-sm">
                                    <div class="flex items-center gap-2 text-gray-300">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                        </svg>
                                        <span>День ${daysSince}</span>
                                    </div>
                                    ${plant.strain ? `
                                    <div class="flex items-center gap-2 text-gray-300">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                                        </svg>
                                        <span>${plant.strain}</span>
                                    </div>
                                    ` : ''}
                                    ${plant.species ? `
                                    <div class="flex items-center gap-2 text-gray-300">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                        </svg>
                                        <span>${this.getSpeciesDisplayName(plant.species)}</span>
                                    </div>
                                    ` : ''}
                                    ${plant.substrate ? `
                                    <div class="flex items-center gap-2 text-gray-300">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z"></path>
                                        </svg>
                                        <span>${this.getSubstrateDisplayName(plant.substrate)}</span>
                                    </div>
                                    ` : ''}
                                    <div class="flex items-center gap-2 text-gray-300">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                                        </svg>
                                        <span>${phaseText}</span>
                                    </div>
                                </div>
                                

                                <!-- Current Phase Progress -->
                                ${this.renderPhaseProgress(plant.id, currentPhase)}

                                <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-600">
                                    <span class="text-xs font-medium px-2 py-1 rounded ${
                                        isSelected ? 'text-primary bg-primary/20' : 
                                        isActive ? 'text-green-400 bg-green-400/20' : 
                                        'text-gray-400 bg-gray-600/20'
                                    }">
                                        ${isSelected ? '✓ ВЫБРАНО' : isActive ? '🟢 АКТИВНО' : '🔴 НЕАКТИВНО'}
                                    </span>
                                    <div class="flex gap-2">
                                        <button onclick="app.editPlant('${plant.id}')" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                            </svg>
                                        </button>
                                        <button onclick="app.deletePlantConfirm('${plant.id}')" class="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                    container.appendChild(plantCard);
                });
            }



            selectPlantFromCard(plantId) {
                // Выбираем растение
                this.data.settings.selectedPlant = plantId;
                this.saveData();
                
                // Перерендериваем список растений для обновления состояния карточек
                this.renderPlantsList();
                
                // Переключаемся на дашборд если мы не на нем
                if (this.data.settings.currentView !== 'dashboard') {
                    this.switchTab('dashboard');
                } else {
                    // Если уже на дашборде, просто обновляем календарь
                    this.renderPlantCalendars();
                }
            }

            highlightSelectedPlantCard(selectedPlantId) {
                // Убираем подсветку со всех карточек
                document.querySelectorAll('#plants-list > div').forEach(card => {
                    card.classList.remove('ring-2', 'ring-primary', 'bg-primary/10');
                    card.classList.add('bg-gray-800');
                });
                
                // Добавляем подсветку к выбранной карточке
                const selectedCard = document.querySelector(`[data-plant-id="${selectedPlantId}"]`);
                if (selectedCard) {
                    selectedCard.classList.remove('bg-gray-800');
                    selectedCard.classList.add('ring-2', 'ring-primary', 'bg-primary/10');
                }
            }

            renderPlantFilter() {
                // Plant filter removed from dashboard as each plant now has its own calendar
                // This method is kept for compatibility
            }

            getPhaseDisplayName(type) {
                const names = {
                    'vegetation': 'Вегетация (18/6)',
                    'flowering': 'Цветение (12/12)',
                    'drying': 'Сушка (0/24)',
                    'harvest': 'Харвест'
                };
                return names[type] || type;
            }

            // Plant calendars rendering
            renderPlantCalendars() {
                const container = document.getElementById('plant-calendars-container');
                const noPlants = document.getElementById('no-plants-message');
                const plants = Object.values(this.data.plants);
                
                // Update month display
                const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                document.getElementById('current-month').textContent = `${monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
                
                if (plants.length === 0) {
                    container.classList.add('hidden');
                    noPlants.classList.remove('hidden');
                    return;
                }
                
                // Get selected plant
                const selectedPlantId = this.data.settings.selectedPlant;
                const selectedPlant = selectedPlantId ? this.data.plants[selectedPlantId] : null;
                
                if (!selectedPlant) {
                    // Show message to select a plant
                    container.classList.remove('hidden');
                    noPlants.classList.add('hidden');
                    container.innerHTML = `
                        <div class="text-center py-16 text-gray-400">
                            <svg class="w-20 h-20 mx-auto mb-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
                            </svg>
                            <h3 class="text-xl font-semibold mb-2">Выберите растение</h3>
                            <p class="text-gray-500 mb-6">Кликните на карточку растения в боковой панели, чтобы увидеть его календарь</p>
                        </div>
                    `;
                    return;
                }
                
                container.classList.remove('hidden');
                noPlants.classList.add('hidden');
                container.innerHTML = '';
                
                // Render calendar for selected plant only
                const currentPhase = this.getCurrentLightPhase(selectedPlant.id, new Date());
                const daysSince = this.getDaysSincePlanting(selectedPlant.id, new Date());
                
                const plantCalendarCard = document.createElement('div');
                plantCalendarCard.className = 'bg-dark rounded-lg overflow-hidden max-w-4xl mx-auto';
                    
                // Plant header with background image
                const backgroundImage = selectedPlant.image || '1nsfSKxFu5LKDqP7zoRtP';
                const backgroundOpacity = selectedPlant.image ? 'opacity-40' : 'opacity-30';
                
                plantCalendarCard.innerHTML = `
                    <!-- Plant Header -->
                    <div class="relative p-6 bg-cover bg-center" style="background-image: url('${backgroundImage}');">
                        <div class="absolute inset-0 bg-black ${backgroundOpacity}"></div>
                        <div class="relative z-10">
                            <!-- Пустой заголовок только с фоном -->
                        </div>
                    </div>

                    <!-- Calendar for this plant -->
                    <div class="p-4">
                        <!-- Calendar Legend for this plant -->
                        <div class="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-800 rounded-lg text-xs">
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 bg-green-600 rounded"></div>
                                <span>🌱 Вегетация</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 bg-purple-600 rounded"></div>
                                <span>🌸 Цветение</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <div class="w-3 h-3 bg-orange-600 rounded"></div>
                                <span>🍂 Сушка</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-blue-400">💧</span>
                                <span>Полив</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-orange-400">🔄</span>
                                <span>Переход фазы</span>
                            </div>
                            <div class="flex items-center gap-2 text-gray-400">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span>Наведите для NPK и деталей</span>
                            </div>
                        </div>

                        <!-- Calendar Grid -->
                        <div class="bg-gray-800 rounded-lg overflow-hidden">
                            <!-- Calendar Header -->
                            <div class="grid grid-cols-7 bg-gray-700">
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Пн</div>
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Вт</div>
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Ср</div>
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Чт</div>
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Пт</div>
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Сб</div>
                                <div class="p-2 text-center font-medium text-gray-300 text-xs">Вс</div>
                            </div>

                            <!-- Calendar Body -->
                            <div class="grid grid-cols-7" id="calendar-grid-${selectedPlant.id}">
                                <!-- Days will be generated by JavaScript -->
                            </div>
                        </div>
                    </div>
                `;
                
                container.appendChild(plantCalendarCard);
                
                // Render calendar for the selected plant
                this.renderPlantCalendar(selectedPlant);
            }

            renderPlantCalendar(plant) {
                const calendarGrid = document.getElementById(`calendar-grid-${plant.id}`);
                if (!calendarGrid) return;
                
                // Clear calendar
                calendarGrid.innerHTML = '';
                
                // Calculate calendar dates
                const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
                const startDate = new Date(firstDay);
                const dayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Make Monday = 0
                startDate.setDate(startDate.getDate() - dayOfWeek);
                
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Generate 42 days (6 weeks)
                for (let i = 0; i < 42; i++) {
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);
                    
                    const dateStr = this.getLocalDateString(currentDate);
                    const isCurrentMonth = currentDate.getMonth() === this.currentMonth.getMonth();
                    const isToday = currentDate.getTime() === today.getTime();
                    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
                    
                    const dayElement = document.createElement('div');
                    dayElement.className = `min-h-16 p-1 border-b border-r border-gray-600 ${
                        isCurrentMonth ? 'bg-gray-800' : 'bg-gray-900 opacity-50'
                    } ${isToday ? 'ring-2 ring-primary' : ''} ${isWeekend ? 'bg-gray-850' : ''} hover:bg-gray-750 transition-colors relative cursor-pointer`;
                    
                    // Day number
                    const dayNumber = document.createElement('div');
                    dayNumber.className = `text-xs font-medium mb-1 ${isToday ? 'text-primary' : isWeekend ? 'text-blue-300' : 'text-white'}`;
                    dayNumber.textContent = currentDate.getDate();
                    dayElement.appendChild(dayNumber);
                    
                    // Collect day information for this specific plant
                    const dayInfo = this.collectPlantDayInfo(dateStr, currentDate, plant);
                    
                    // Add icons based on day information
                    this.renderPlantDayIcons(dayElement, dayInfo, plant);
                    
                    // Add tooltip for this plant
                    if (dayInfo.hasInfo) {
                        this.addPlantDayTooltip(dayElement, dayInfo, currentDate, plant);
                    }
                    
                    calendarGrid.appendChild(dayElement);
                }
            }

            // Legacy method for compatibility
            renderCalendar() {
                this.renderPlantCalendars();
            }

            // Helper function to get date string in local timezone
            getLocalDateString(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }

            collectPlantDayInfo(dateStr, date, plant) {
                const info = {
                    hasInfo: false,
                    phase: null,
                    daysSincePlanting: 0,
                    daysSincePhaseStart: 0,
                    weekInPhase: 0,
                    waterings: [],
                    milestones: [],
                    phaseTransitions: []
                };
                
                if (!plant) return info;
                
                const phase = this.getCurrentLightPhase(plant.id, date);
                const daysSincePlanting = this.getDaysSincePlanting(plant.id, date);
                
                if (phase && daysSincePlanting > 0) {
                    const phaseStartDate = new Date(phase.startDate);
                    const currentDate = new Date(date);
                    const daysSincePhaseStart = Math.floor((currentDate - phaseStartDate) / (1000 * 60 * 60 * 24)) + 1;
                    const weekInPhase = Math.ceil(daysSincePhaseStart / 7);
                    
                    info.phase = phase;
                    info.daysSincePlanting = daysSincePlanting;
                    info.daysSincePhaseStart = daysSincePhaseStart;
                    info.weekInPhase = weekInPhase;
                    info.hasInfo = true;
                }
                
                // Check for milestones
                if (daysSincePlanting === 1) {
                    info.milestones.push({ type: 'planted', plant: plant });
                    info.hasInfo = true;
                } else if (daysSincePlanting === 14) {
                    info.milestones.push({ type: '2weeks', plant: plant });
                    info.hasInfo = true;
                } else if (daysSincePlanting === 28) {
                    info.milestones.push({ type: '1month', plant: plant });
                    info.hasInfo = true;
                }
                
                // Check for phase transitions
                if (this.isPhaseTransition(date, plant)) {
                    const nextPhase = this.getPhaseTransitionInfo(date, plant);
                    if (nextPhase) {
                        info.phaseTransitions.push({ plant: plant, phase: nextPhase });
                        info.hasInfo = true;
                    }
                }
                
                // Collect watering information for this specific plant
                const dayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = this.getLocalDateString(new Date(watering.date));
                    return wateringDate === dateStr && watering.plantIds.includes(plant.id);
                });
                
                if (dayWaterings.length > 0) {
                    info.waterings = dayWaterings;
                    info.hasInfo = true;
                }
                
                return info;
            }

            collectDayInfo(dateStr, date) {
                const selectedPlantId = this.data.settings.selectedPlant;
                const plantsToShow = selectedPlantId && this.data.plants[selectedPlantId] 
                    ? [this.data.plants[selectedPlantId]] 
                    : Object.values(this.data.plants);
                
                const info = {
                    hasInfo: false,
                    plants: [],
                    waterings: [],
                    milestones: [],
                    phaseTransitions: []
                };
                
                // Collect plant phase information
                plantsToShow.forEach(plant => {
                    if (!plant) return;
                    
                    const phase = this.getCurrentLightPhase(plant.id, date);
                    const daysSincePlanting = this.getDaysSincePlanting(plant.id, date);
                    
                    if (phase && daysSincePlanting > 0) {
                        const phaseStartDate = new Date(phase.startDate);
                        const currentDate = new Date(date);
                        const daysSincePhaseStart = Math.floor((currentDate - phaseStartDate) / (1000 * 60 * 60 * 1000)) + 1;
                        const weekInPhase = Math.ceil(daysSincePhaseStart / 7);
                        
                        info.plants.push({
                            plant: plant,
                            phase: phase,
                            daysSincePlanting: daysSincePlanting,
                            daysSincePhaseStart: daysSincePhaseStart,
                            weekInPhase: weekInPhase
                        });
                        info.hasInfo = true;
                    }
                    
                    // Check for milestones
                    if (daysSincePlanting === 1) {
                        info.milestones.push({ type: 'planted', plant: plant });
                        info.hasInfo = true;
                    } else if (daysSincePlanting === 14) {
                        info.milestones.push({ type: '2weeks', plant: plant });
                        info.hasInfo = true;
                    } else if (daysSincePlanting === 28) {
                        info.milestones.push({ type: '1month', plant: plant });
                        info.hasInfo = true;
                    }
                    
                    // Check for phase transitions
                    if (this.isPhaseTransition(date, plant)) {
                        const nextPhase = this.getPhaseTransitionInfo(date, plant);
                        if (nextPhase) {
                            info.phaseTransitions.push({ plant: plant, phase: nextPhase });
                            info.hasInfo = true;
                        }
                    }
                });
                
                // Collect watering information
                const dayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = this.getLocalDateString(new Date(watering.date));
                    return wateringDate === dateStr;
                });
                
                if (dayWaterings.length > 0) {
                    info.waterings = dayWaterings;
                    info.hasInfo = true;
                }
                
                return info;
            }

            renderPlantDayIcons(dayElement, dayInfo, plant) {
                const iconsContainer = document.createElement('div');
                iconsContainer.className = 'flex flex-wrap gap-1 text-xs';
                
                // Phase icon for this plant
                if (dayInfo.phase) {
                    const icon = document.createElement('span');
                    icon.className = 'inline-flex items-center';
                    icon.innerHTML = this.getPhaseIcon(dayInfo.phase.type);
                    iconsContainer.appendChild(icon);
                }
                
                // Watering icons for this plant (без NPK отображения)
                if (dayInfo.waterings.length > 0) {
                    const waterIcon = document.createElement('span');
                    waterIcon.className = 'text-blue-400';
                    waterIcon.textContent = `💧${dayInfo.waterings.length > 1 ? dayInfo.waterings.length : ''}`;
                    iconsContainer.appendChild(waterIcon);
                }
                
                // Milestone icons
                dayInfo.milestones.forEach(milestone => {
                    const milestoneIcon = document.createElement('span');
                    if (milestone.type === 'planted') {
                        milestoneIcon.textContent = '🌱';
                        milestoneIcon.className = 'text-green-400';
                    } else if (milestone.type === '2weeks') {
                        milestoneIcon.textContent = '📈';
                        milestoneIcon.className = 'text-blue-400';
                    } else if (milestone.type === '1month') {
                        milestoneIcon.textContent = '🎂';
                        milestoneIcon.className = 'text-purple-400';
                    }
                    iconsContainer.appendChild(milestoneIcon);
                });
                
                // Phase transition icons
                if (dayInfo.phaseTransitions.length > 0) {
                    const transitionIcon = document.createElement('span');
                    transitionIcon.textContent = '🔄';
                    transitionIcon.className = 'text-orange-400';
                    iconsContainer.appendChild(transitionIcon);
                }
                
                dayElement.appendChild(iconsContainer);
            }

            renderDayIcons(dayElement, dayInfo) {
                const iconsContainer = document.createElement('div');
                iconsContainer.className = 'flex flex-wrap gap-1 text-xs';
                
                // Phase icons
                const phaseTypes = {};
                dayInfo.plants.forEach(plantInfo => {
                    phaseTypes[plantInfo.phase.type] = (phaseTypes[plantInfo.phase.type] || 0) + 1;
                });
                
                Object.entries(phaseTypes).forEach(([type, count]) => {
                    const icon = document.createElement('span');
                    icon.className = 'inline-flex items-center';
                    icon.innerHTML = `${this.getPhaseIcon(type)}${count > 1 ? `<sub class="text-xs">${count}</sub>` : ''}`;
                    iconsContainer.appendChild(icon);
                });
                
                // Watering icons
                if (dayInfo.waterings.length > 0) {
                    const waterIcon = document.createElement('span');
                    waterIcon.className = 'text-blue-400';
                    waterIcon.textContent = `💧${dayInfo.waterings.length > 1 ? dayInfo.waterings.length : ''}`;
                    iconsContainer.appendChild(waterIcon);
                }
                
                // Milestone icons
                dayInfo.milestones.forEach(milestone => {
                    const milestoneIcon = document.createElement('span');
                    if (milestone.type === 'planted') {
                        milestoneIcon.textContent = '🌱';
                        milestoneIcon.className = 'text-green-400';
                    } else if (milestone.type === '2weeks') {
                        milestoneIcon.textContent = '📈';
                        milestoneIcon.className = 'text-blue-400';
                    } else if (milestone.type === '1month') {
                        milestoneIcon.textContent = '🎂';
                        milestoneIcon.className = 'text-purple-400';
                    }
                    iconsContainer.appendChild(milestoneIcon);
                });
                
                // Phase transition icons
                if (dayInfo.phaseTransitions.length > 0) {
                    const transitionIcon = document.createElement('span');
                    transitionIcon.textContent = '🔄';
                    transitionIcon.className = 'text-orange-400';
                    iconsContainer.appendChild(transitionIcon);
                }
                
                dayElement.appendChild(iconsContainer);
            }

            addPlantDayTooltip(dayElement, dayInfo, date, plant) {
                let tooltipContent = '';
                
                // Date header
                tooltipContent += `📅 ${date.toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long' 
                })}\n`;
                tooltipContent += `🌿 ${plant.name}\n\n`;
                
                // Plant information
                if (dayInfo.phase) {
                    tooltipContent += `📊 День ${dayInfo.daysSincePlanting} с посадки\n`;
                    tooltipContent += `${this.getPhaseIcon(dayInfo.phase.type)} ${this.getPhaseDisplayName(dayInfo.phase.type)}\n`;
                    tooltipContent += `📍 День ${dayInfo.daysSincePhaseStart} в фазе (неделя ${dayInfo.weekInPhase})\n`;
                    tooltipContent += `💡 Свет: ${dayInfo.phase.lightOnTime} - ${dayInfo.phase.lightOffTime}\n\n`;
                }
                
                // Watering information for this plant with NPK
                if (dayInfo.waterings.length > 0) {
                    tooltipContent += '💧 Поливы:\n';
                    dayInfo.waterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        
                        tooltipContent += `• ${time}: ${watering.volume}л ${recipe ? `+ ${recipe.name}` : '(только вода)'}\n`;
                        
                        // Add NPK information if recipe is used
                        if (recipe) {
                            const npkValues = this.calculateRecipeNPK(recipe);
                            tooltipContent += `  🧪 NPK: ${npkValues.n.toFixed(0)}-${npkValues.p.toFixed(0)}-${npkValues.k.toFixed(0)} мг/л\n`;
                        }
                        
                        if (watering.notes) {
                            tooltipContent += `  📝 ${watering.notes}\n`;
                        }
                    });
                    tooltipContent += '\n';
                }
                
                // Milestones
                if (dayInfo.milestones.length > 0) {
                    tooltipContent += '🎯 События:\n';
                    dayInfo.milestones.forEach(milestone => {
                        if (milestone.type === 'planted') {
                            tooltipContent += `• День посадки\n`;
                        } else if (milestone.type === '2weeks') {
                            tooltipContent += `• 2 недели роста\n`;
                        } else if (milestone.type === '1month') {
                            tooltipContent += `• 1 месяц роста\n`;
                        }
                    });
                    tooltipContent += '\n';
                }
                
                // Phase transitions
                if (dayInfo.phaseTransitions.length > 0) {
                    tooltipContent += '🔄 Переходы фаз:\n';
                    dayInfo.phaseTransitions.forEach(transition => {
                        tooltipContent += `• → ${transition.phase}\n`;
                    });
                }
                
                // Add custom tooltip using CSS (no standard title attribute to avoid double tooltips)
                dayElement.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e.target, tooltipContent.trim());
                });
                
                dayElement.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
            }

            addDayTooltip(dayElement, dayInfo, date) {
                let tooltipContent = '';
                
                // Date header
                tooltipContent += `📅 ${date.toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long' 
                })}\n\n`;
                
                // Plants information
                if (dayInfo.plants.length > 0) {
                    tooltipContent += '🌿 Растения:\n';
                    dayInfo.plants.forEach(plantInfo => {
                        tooltipContent += `• ${plantInfo.plant.name}: `;
                        tooltipContent += `День ${plantInfo.daysSincePlanting} `;
                        tooltipContent += `(${this.getPhaseDisplayName(plantInfo.phase.type)}, `;
                        tooltipContent += `неделя ${plantInfo.weekInPhase})\n`;
                        tooltipContent += `  💡 ${plantInfo.phase.lightOnTime} - ${plantInfo.phase.lightOffTime}\n`;
                    });
                    tooltipContent += '\n';
                }
                
                // Watering information
                if (dayInfo.waterings.length > 0) {
                    tooltipContent += '💧 Поливы:\n';
                    dayInfo.waterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        });
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        const plantsNames = watering.plantIds.map(id => 
                            this.data.plants[id]?.name || 'Неизвестное растение'
                        ).join(', ');
                        
                        tooltipContent += `• ${time}: ${plantsNames}\n`;
                        tooltipContent += `  ${watering.volume}л ${recipe ? `+ ${recipe.name}` : '(только вода)'}\n`;
                        if (watering.notes) {
                            tooltipContent += `  📝 ${watering.notes}\n`;
                        }
                    });
                    tooltipContent += '\n';
                }
                
                // Milestones
                if (dayInfo.milestones.length > 0) {
                    tooltipContent += '🎯 События:\n';
                    dayInfo.milestones.forEach(milestone => {
                        if (milestone.type === 'planted') {
                            tooltipContent += `• ${milestone.plant.name}: День посадки\n`;
                        } else if (milestone.type === '2weeks') {
                            tooltipContent += `• ${milestone.plant.name}: 2 недели роста\n`;
                        } else if (milestone.type === '1month') {
                            tooltipContent += `• ${milestone.plant.name}: 1 месяц роста\n`;
                        }
                    });
                    tooltipContent += '\n';
                }
                
                // Phase transitions
                if (dayInfo.phaseTransitions.length > 0) {
                    tooltipContent += '🔄 Переходы фаз:\n';
                    dayInfo.phaseTransitions.forEach(transition => {
                        tooltipContent += `• ${transition.plant.name}: → ${transition.phase}\n`;
                    });
                }
                
                // Add custom tooltip using CSS (no standard title attribute to avoid double tooltips)
                dayElement.addEventListener('mouseenter', (e) => {
                    this.showTooltip(e.target, tooltipContent.trim());
                });
                
                dayElement.addEventListener('mouseleave', () => {
                    this.hideTooltip();
                });
            }

            showTooltip(element, content) {
                // Remove existing tooltip
                this.hideTooltip();
                
                const tooltip = document.createElement('div');
                tooltip.id = 'calendar-tooltip';
                tooltip.className = 'fixed z-50 bg-gray-900 text-white text-xs p-3 rounded-lg shadow-lg max-w-xs border border-gray-600 whitespace-pre-line';
                tooltip.textContent = content;
                
                document.body.appendChild(tooltip);
                
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                
                // Position tooltip
                let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                let top = rect.top - tooltipRect.height - 8;
                
                // Adjust if tooltip goes off screen
                if (left < 8) left = 8;
                if (left + tooltipRect.width > window.innerWidth - 8) {
                    left = window.innerWidth - tooltipRect.width - 8;
                }
                if (top < 8) {
                    top = rect.bottom + 8;
                }
                
                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            }

            hideTooltip() {
                const tooltip = document.getElementById('calendar-tooltip');
                if (tooltip) {
                    tooltip.remove();
                }
            }

            renderDayEvents(dayElement, dateStr, date) {
                // This method is now replaced by the new compact icon system
                // The day information is collected in collectDayInfo and displayed as icons
                return;
            }

            getPhaseShortName(type) {
                const names = {
                    'vegetation': 'Вегетация',
                    'flowering': 'Цветение',
                    'drying': 'Сушка',
                    'harvest': 'Харвест',
                    'unknown': 'Неизвестно'
                };
                return names[type] || type;
            }

            getSpeciesDisplayName(species) {
                const names = {
                    'cannabis-indica': '🌿 Cannabis Indica',
                    'cannabis-sativa': '🌲 Cannabis Sativa',
                    'cannabis-hybrid': '🌳 Cannabis Hybrid',
                    'cannabis-ruderalis': '🌾 Cannabis Ruderalis',
                    'tomato': '🍅 Томат',
                    'pepper': '🌶️ Перец',
                    'cucumber': '🥒 Огурец',
                    'lettuce': '🥬 Салат',
                    'basil': '🌿 Базилик',
                    'mint': '🌿 Мята',
                    'parsley': '🌿 Петрушка',
                    'cilantro': '🌿 Кинза',
                    'spinach': '🥬 Шпинат',
                    'other': '❓ Другое'
                };
                return names[species] || species;
            }

            getSubstrateDisplayName(substrate) {
                const names = {
                    'soil-organic': '🌍 Органическая почва',
                    'soil-commercial': '🏪 Коммерческая почва',
                    'coco-coir': '🥥 Кокосовое волокно',
                    'perlite-vermiculite': '⚪ Перлит + Вермикулит',
                    'hydroponic-clay': '🔵 Гидропоника (керамзит)',
                    'hydroponic-rockwool': '🧽 Гидропоника (минвата)',
                    'hydroponic-dwc': '💧 Гидропоника (DWC)',
                    'hydroponic-nft': '🌊 Гидропоника (NFT)',
                    'aeroponic': '💨 Аэропоника',
                    'soilless-mix': '🌿 Беспочвенная смесь',
                    'peat-moss': '🍄 Торфяной мох',
                    'other': '❓ Другое'
                };
                return names[substrate] || substrate;
            }

            shouldShowWateringReminder(date, plant) {
                // Show watering reminder every 2-3 days (simplified logic)
                const daysSincePlanting = this.getDaysSincePlanting(plant.id, date);
                return daysSincePlanting > 0 && daysSincePlanting % 3 === 0;
            }

            getWateringInfoForDate(date, plant) {
                const dateStr = this.getLocalDateString(date);
                
                // Поиск поливов для конкретного растения в этот день
                const waterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = this.getLocalDateString(new Date(watering.date));
                    return wateringDate === dateStr && watering.plantIds.includes(plant.id);
                });
                
                if (waterings.length === 0) {
                    return null;
                }
                
                // Показываем информацию о последнем поливе в этот день
                const watering = waterings[waterings.length - 1];
                const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                
                if (recipe) {
                    return `${watering.volume}л + ${recipe.name}`;
                } else {
                    return `${watering.volume}л воды`;
                }
            }

            shouldShowFeedingReminder(date, plant, phase) {
                // Show feeding reminder based on phase (weekly for veg, bi-weekly for flower)
                const daysSincePlanting = this.getDaysSincePlanting(plant.id, date);
                if (phase.type === 'vegetation') {
                    return daysSincePlanting > 0 && daysSincePlanting % 7 === 0;
                } else if (phase.type === 'flowering') {
                    return daysSincePlanting > 0 && daysSincePlanting % 14 === 0;
                }
                return false;
            }

            addCalendarMilestones(dayElement, dateStr, plants) {
                const date = new Date(dateStr);
                
                // Добавляем информацию о поливах для всех растений в этот день
                const dayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = new Date(watering.date).toISOString().split('T')[0];
                    return wateringDate === dateStr;
                });
                
                if (dayWaterings.length > 0) {
                    dayWaterings.forEach(watering => {
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        const plantsCount = watering.plantIds.length;
                        const wateringText = plantsCount > 1 
                            ? `${plantsCount} растений • ${watering.volume}л` 
                            : `${watering.volume}л`;
                        
                        this.addMilestone(dayElement, '💧', wateringText, 'bg-blue-500');
                        
                        if (recipe) {
                            this.addMilestone(dayElement, '🧪', recipe.name.substring(0, 12), 'bg-cyan-600');
                        }
                    });
                }
                
                plants.forEach(plant => {
                    const plantDate = new Date(plant.plantDate);
                    const daysSince = this.getDaysSincePlanting(plant.id, date);
                    
                    // Check for important milestones
                    if (daysSince === 1) {
                        this.addMilestone(dayElement, '🌱', 'День посадки', 'bg-green-500');
                    } else if (daysSince === 14) {
                        this.addMilestone(dayElement, '📈', '2 недели роста', 'bg-blue-500');
                    } else if (daysSince === 28) {
                        this.addMilestone(dayElement, '🔄', 'Месяц роста', 'bg-purple-500');
                    } else if (this.isPhaseTransition(date, plant)) {
                        const nextPhase = this.getPhaseTransitionInfo(date, plant);
                        if (nextPhase) {
                            this.addMilestone(dayElement, '🔄', `→ ${nextPhase}`, 'bg-orange-500');
                        }
                    }
                });
            }

            addMilestone(dayElement, icon, text, bgColor) {
                const milestone = document.createElement('div');
                milestone.className = `text-xs p-1 mt-1 rounded ${bgColor} text-white font-medium flex items-center gap-1`;
                milestone.innerHTML = `
                    <span>${icon}</span>
                    <span class="truncate">${text}</span>
                `;
                dayElement.appendChild(milestone);
            }

            isPhaseTransition(date, plant) {
                const phases = Object.values(this.data.lightPhases)
                    .filter(phase => phase.plantId === plant.id)
                    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
                
                const dateStr = date.toISOString().split('T')[0];
                return phases.some(phase => phase.startDate === dateStr);
            }

            getPhaseTransitionInfo(date, plant) {
                const phase = this.getCurrentLightPhase(plant.id, date);
                if (phase) {
                    const dateStr = date.toISOString().split('T')[0];
                    if (phase.startDate === dateStr) {
                        return this.getPhaseShortName(phase.type);
                    }
                }
                return null;
            }

            showDayDetails(date, plant, phase) {
                const daysSincePlanting = this.getDaysSincePlanting(plant.id, date);
                const phaseStartDate = new Date(phase.startDate);
                const daysSincePhaseStart = Math.floor((date - phaseStartDate) / (1000 * 60 * 60 * 24)) + 1;
                
                // Получаем поливы для этого растения в этот день
                const dateStr = date.toISOString().split('T')[0];
                const dayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = new Date(watering.date).toISOString().split('T')[0];
                    return wateringDate === dateStr && watering.plantIds.includes(plant.id);
                });
                
                let wateringInfo = '';
                if (dayWaterings.length > 0) {
                    wateringInfo = '\n💧 История поливов:\n';
                    dayWaterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        wateringInfo += `• ${time}: ${watering.volume}л ${recipe ? `+ ${recipe.name}` : '(только вода)'}\n`;
                        if (watering.notes) {
                            wateringInfo += `  Заметки: ${watering.notes}\n`;
                        }
                    });
                    wateringInfo += '\n💡 Совет: В разделе "События сегодня" можно удалить ошибочные записи о поливе';
                }
                
                alert(`
📅 Детали дня: ${date.toLocaleDateString('ru-RU')}

🌿 Растение: ${plant.name}
${plant.strain ? `🧬 Сорт: ${plant.strain}` : ''}

📊 Статистика:
• День с посадки: ${daysSincePlanting}
• Фаза: ${this.getPhaseDisplayName(phase.type)}
• День в фазе: ${daysSincePhaseStart}

💡 Световой режим:
• Включение: ${phase.lightOnTime}
• Выключение: ${phase.lightOffTime || 'Не установлено'}
• Режим: ${phase.schedule ? `${phase.schedule.on}/${phase.schedule.off}` : 'Не установлен'}
${wateringInfo}
${dayWaterings.length === 0 && this.shouldShowWateringReminder(date, plant) ? '💧 Рекомендуется полив\n' : ''}
${this.shouldShowFeedingReminder(date, plant, phase) ? '🌿 Рекомендуется подкормка\n' : ''}
                `);
            }

            getPhaseColor(type) {
                const colors = {
                    'vegetation': 'bg-green-600 text-white',
                    'flowering': 'bg-purple-600 text-white',
                    'drying': 'bg-orange-600 text-white',
                    'harvest': 'bg-red-600 text-white'
                };
                return colors[type] || 'bg-gray-600 text-white';
            }

            getPhaseIcon(type) {
                const icons = {
                    'vegetation': '🌱',
                    'flowering': '🌸',
                    'drying': '🍂',
                    'harvest': '🌾'
                };
                return icons[type] || '⚫';
            }

            // Calendar navigation
            previousMonth() {
                this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
                this.renderPlantCalendars();
            }

            nextMonth() {
                this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
                this.renderPlantCalendars();
            }

            goToToday() {
                this.currentMonth = new Date();
                this.renderPlantCalendars();
            }

            // Dashboard rendering
            renderDashboard() {
                // Render today's events
                this.renderTodayEvents();
            }

            renderTodayEvents() {
                const sidebarContainer = document.getElementById('sidebar-today-events');
                
                if (sidebarContainer) sidebarContainer.innerHTML = '';

                const today = this.getLocalDateString(new Date());
                const plants = Object.values(this.data.plants);
                
                // Получаем сегодняшние поливы
                const todayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = this.getLocalDateString(new Date(watering.date));
                    return wateringDate === today;
                });

                if (plants.length === 0) {
                    const noDataMsg = '<div class="text-gray-400 text-sm">Добавьте растения для просмотра событий</div>';
                    if (sidebarContainer) sidebarContainer.innerHTML = noDataMsg;
                    return;
                }

                // Показываем сегодняшние поливы только в боковой панели
                if (todayWaterings.length > 0 && sidebarContainer) {
                    todayWaterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const plantsNames = watering.plantIds.map(id => this.data.plants[id]?.name || 'Неизвестное растение').join(', ');
                        
                        // Sidebar version (compact)
                        const sidebarWateringEl = document.createElement('div');
                        sidebarWateringEl.className = 'flex items-center gap-2 p-2 bg-blue-600/20 rounded-lg text-sm';
                        sidebarWateringEl.innerHTML = `
                            <span class="text-blue-400">💧</span>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium truncate">${plantsNames.length > 20 ? plantsNames.substring(0, 20) + '...' : plantsNames}</div>
                                <div class="text-xs text-gray-400">${time} • ${watering.volume}л</div>
                            </div>
                        `;
                        sidebarContainer.appendChild(sidebarWateringEl);
                    });
                }

                // Показываем активные растения только в боковой панели
                if (sidebarContainer) {
                    plants.forEach(plant => {
                        const phase = this.getCurrentLightPhase(plant.id, new Date());
                        if (phase) {
                            const sidebarEventEl = document.createElement('div');
                            sidebarEventEl.className = 'flex items-center gap-2 p-2 bg-gray-800 rounded-lg text-sm';
                            sidebarEventEl.innerHTML = `
                                <span>${this.getPhaseIcon(phase.type)}</span>
                                <div class="flex-1 min-w-0">
                                    <div class="font-medium truncate">${plant.name}</div>
                                    <div class="text-xs text-gray-400">${this.getPhaseShortName(phase.type)} • ${phase.lightOnTime}</div>
                                </div>
                            `;
                            sidebarContainer.appendChild(sidebarEventEl);
                        }
                    });
                }
            }

            // Fertilizer rendering
            renderFertilizers() {
                const container = document.getElementById('fertilizers-grid');
                const fertilizers = Object.values(this.data.fertilizers);
                
                container.innerHTML = '';
                
                fertilizers.forEach(fertilizer => {
                    const fertilizerCard = document.createElement('div');
                    fertilizerCard.className = 'bg-dark rounded-lg overflow-hidden max-w-sm';
                    
                    // Use fertilizer image if available, otherwise use default
                    const backgroundImage = fertilizer.image || '1nsfSKxFu5LKDqP7zoRtP';
                    
                    fertilizerCard.innerHTML = `
                        <!-- Fertilizer Header -->
                        <div class="bg-gray-700 p-2 flex items-center justify-between">
                            <div class="flex items-center gap-2 flex-1 min-w-0">
                                <!-- Small fertilizer image -->
                                <div class="w-8 h-8 bg-gray-600 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all" onclick="app.showFertilizerImageModal('${fertilizer.id}')">
                                    <img src="${backgroundImage}" alt="${fertilizer.name}" class="w-full h-full object-cover">
                                </div>
                                <!-- Fertilizer info -->
                                <div class="flex-1 min-w-0">
                                    <h3 class="text-sm font-semibold text-white truncate">${fertilizer.name}</h3>
                                    <div class="text-xs text-gray-400">
                                        ${fertilizer.density}г/мл
                                    </div>
                                </div>
                            </div>
                            <!-- Action buttons -->
                            <div class="flex gap-1 ml-1">
                                <button onclick="app.editFertilizer('${fertilizer.id}')" class="p-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors">
                                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button onclick="app.deleteFertilizerConfirm('${fertilizer.id}')" class="p-1 bg-gray-600 hover:bg-gray-500 rounded transition-colors">
                                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <!-- Fertilizer Details -->
                        <div class="p-2">
                            <div class="grid grid-cols-3 gap-1">
                                <div class="text-center p-1.5 bg-gray-800 rounded">
                                    <div class="text-sm font-bold text-blue-400">${fertilizer.npk.n}%</div>
                                    <div class="text-xs text-gray-400">N</div>
                                </div>
                                <div class="text-center p-1.5 bg-gray-800 rounded">
                                    <div class="text-sm font-bold text-yellow-400">${fertilizer.npk.p}%</div>
                                    <div class="text-xs text-gray-400">P</div>
                                </div>
                                <div class="text-center p-1.5 bg-gray-800 rounded">
                                    <div class="text-sm font-bold text-purple-400">${fertilizer.npk.k}%</div>
                                    <div class="text-xs text-gray-400">K</div>
                                </div>
                            </div>
                            ${fertilizer.microElements ? `
                                <div class="mt-2 text-xs text-gray-400 text-center truncate" title="${fertilizer.microElements}">
                                    ${fertilizer.microElements.length > 20 ? fertilizer.microElements.substring(0, 20) + '...' : fertilizer.microElements}
                                </div>
                            ` : ''}
                        </div>
                    `;
                    container.appendChild(fertilizerCard);
                });
            }

            // Recipe rendering
            renderRecipes() {
                const container = document.getElementById('recipes-list');
                const recipes = Object.values(this.data.recipes);
                
                container.innerHTML = '';
                
                recipes.forEach(recipe => {
                    const totals = this.calculateRecipeTotals(recipe);
                    
                    const recipeCard = document.createElement('div');
                    recipeCard.className = 'bg-dark p-3 rounded-lg max-w-sm';
                    recipeCard.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1 min-w-0">
                                <h3 class="text-sm font-semibold truncate">${recipe.name}</h3>
                                <div class="text-xs text-gray-400">${recipe.volume}л</div>
                            </div>
                            <div class="flex gap-1 ml-2">
                                <button onclick="app.editRecipe('${recipe.id}')" class="p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                    </svg>
                                </button>
                                <button onclick="app.deleteRecipeConfirm('${recipe.id}')" class="p-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="mb-2">
                            <div class="space-y-0.5">
                                ${recipe.fertilizers.map(fert => {
                                    const fertilizer = this.data.fertilizers[fert.fertilizerId];
                                    return fertilizer ? `
                                        <div class="text-xs text-gray-300 flex justify-between">
                                            <span class="truncate mr-2">${fertilizer.name}</span>
                                            <span class="text-primary whitespace-nowrap">${fert.dose}мл</span>
                                        </div>
                                    ` : '';
                                }).join('')}
                            </div>
                        </div>
                        
                        <div class="bg-gray-800 p-2 rounded">
                            <div class="grid grid-cols-3 gap-1 text-xs">
                                <div class="text-center">
                                    <div class="text-blue-400 font-medium text-sm">${totals.n.toFixed(0)}</div>
                                    <div class="text-gray-500 text-xs">N</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-yellow-400 font-medium text-sm">${totals.p.toFixed(0)}</div>
                                    <div class="text-gray-500 text-xs">P</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-purple-400 font-medium text-sm">${totals.k.toFixed(0)}</div>
                                    <div class="text-gray-500 text-xs">K</div>
                                </div>
                            </div>
                        </div>
                    `;
                    container.appendChild(recipeCard);
                });
            }

            calculateRecipeTotals(recipe) {
                let totals = { n: 0, p: 0, k: 0 };
                
                recipe.fertilizers.forEach(fert => {
                    const fertilizer = this.data.fertilizers[fert.fertilizerId];
                    if (fertilizer) {
                        // Calculate nutrient contribution in mg/L
                        // dose (ml/L) * density (g/ml) * npk (%) * 10 = mg/L
                        totals.n += fert.dose * fertilizer.density * fertilizer.npk.n * 10;
                        totals.p += fert.dose * fertilizer.density * fertilizer.npk.p * 10;
                        totals.k += fert.dose * fertilizer.density * fertilizer.npk.k * 10;
                    }
                });
                
                return totals;
            }

            // Helper method for NPK calculation (alias for compatibility)
            calculateRecipeNPK(recipe) {
                return this.calculateRecipeTotals(recipe);
            }

            // Modal management
            showPlantModal(plantId = null) {
                this.currentPlantId = plantId;
                const modal = document.getElementById('plant-modal');
                const title = document.getElementById('plant-modal-title');
                const form = document.getElementById('plant-form');
                
                if (plantId) {
                    title.textContent = 'Редактировать растение';
                    const plant = this.data.plants[plantId];
                    document.getElementById('plant-name').value = plant.name;
                    document.getElementById('plant-date').value = plant.plantDate;
                    document.getElementById('plant-strain').value = plant.strain || '';
                    document.getElementById('plant-species').value = plant.species || '';
                    document.getElementById('plant-substrate').value = plant.substrate || '';
                    document.getElementById('plant-light-on').value = plant.lightOnTime || '08:00';
                    
                    // Отображаем текущее изображение если есть
                    if (plant.image) {
                        const previewContainer = document.getElementById('plant-image-preview');
                        const previewImg = document.getElementById('plant-preview-img');
                        const imageUrlInput = document.getElementById('plant-image-url');
                        
                        previewImg.src = plant.image;
                        previewContainer.classList.remove('hidden');
                        
                        // Если это URL (не data URL), показываем в поле URL
                        if (plant.image.startsWith('http')) {
                            imageUrlInput.value = plant.image;
                            this.switchPlantUploadMode('url');
                        } else {
                            // Это base64 или относительная ссылка, показываем в файловом режиме
                            this.switchPlantUploadMode('file');
                        }
                    } else {
                        document.getElementById('plant-image-preview').classList.add('hidden');
                        this.switchPlantUploadMode('file');
                    }
                    
                    // Сбрасываем input файла
                    document.getElementById('plant-image').value = '';
                    
                    // Load growth phase settings
                    if (plant.growthPhases && plant.growthPhases.useDates) {
                        // Date mode
                        this.setPhaseMode('dates');
                        document.getElementById('veg-start-date').value = plant.growthPhases.vegStartDate || plant.plantDate;
                        document.getElementById('veg-end-date').value = plant.growthPhases.vegEndDate || '';
                        document.getElementById('flower-start-date').value = plant.growthPhases.flowerStartDate || '';
                        document.getElementById('flower-end-date').value = plant.growthPhases.flowerEndDate || '';
                        document.getElementById('dry-start-date').value = plant.growthPhases.dryStartDate || '';
                        document.getElementById('dry-end-date').value = plant.growthPhases.dryEndDate || '';
                    } else {
                        // Duration mode
                        this.setPhaseMode('duration');
                        const phases = plant.growthPhases || { vegetation: 28, flowering: 63, drying: 10 };
                        document.getElementById('veg-duration').value = phases.vegetation;
                        document.getElementById('flower-duration').value = phases.flowering;
                        document.getElementById('dry-duration').value = phases.drying;
                    }
                } else {
                    title.textContent = 'Добавить растение';
                    form.reset();
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('plant-date').value = today;
                    
                    // Скрываем превью изображения
                    document.getElementById('plant-image-preview').classList.add('hidden');
                    
                    // Default to date mode for new plants
                    this.setPhaseMode('dates');
                    this.calculateDefaultDates(today);
                }
                
                // Add event listeners for mode switching
                document.getElementById('date-mode-btn').onclick = () => this.setPhaseMode('dates');
                document.getElementById('duration-mode-btn').onclick = () => this.setPhaseMode('duration');
                
                // Add event listeners for image handling
                this.setupImageHandlers();
                
                // Add event listeners for real-time updates
                this.addPhaseInputListeners();
                
                modal.classList.remove('hidden');
                this.updateGrowthForecast();
            }

            setupImageHandlers() {
                const imageInput = document.getElementById('plant-image');
                const imageUrlInput = document.getElementById('plant-image-url');
                const previewContainer = document.getElementById('plant-image-preview');
                const previewImg = document.getElementById('plant-preview-img');
                const removeBtn = document.getElementById('remove-plant-image');
                
                // Tab switching
                const fileBtn = document.getElementById('plant-upload-file-btn');
                const urlBtn = document.getElementById('plant-upload-url-btn');
                const loadUrlBtn = document.getElementById('load-plant-image-url');

                fileBtn.addEventListener('click', () => this.switchPlantUploadMode('file'));
                urlBtn.addEventListener('click', () => this.switchPlantUploadMode('url'));

                // Обработчик загрузки файла
                imageInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Проверяем размер файла (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Размер файла слишком большой. Максимальный размер: 5MB');
                        imageInput.value = '';
                        return;
                    }

                    // Проверяем тип файла
                    if (!file.type.startsWith('image/')) {
                        alert('Пожалуйста, выберите изображение');
                        imageInput.value = '';
                        return;
                    }

                    // Читаем файл и показываем превью
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        previewContainer.classList.remove('hidden');
                        // Clear URL input when file is loaded
                        imageUrlInput.value = '';
                    };
                    reader.readAsDataURL(file);
                });

                // Обработчик загрузки по URL
                loadUrlBtn.addEventListener('click', () => this.loadPlantImageFromUrl());

                // Обработчик удаления изображения
                removeBtn.addEventListener('click', () => {
                    imageInput.value = '';
                    imageUrlInput.value = '';
                    previewContainer.classList.add('hidden');
                    previewImg.src = '';
                });
            }

            setPhaseMode(mode) {
                this.currentPhaseMode = mode;
                
                const dateModeBtn = document.getElementById('date-mode-btn');
                const durationModeBtn = document.getElementById('duration-mode-btn');
                const dateModeConfig = document.getElementById('date-mode-config');
                const durationModeConfig = document.getElementById('duration-mode-config');
                
                if (mode === 'dates') {
                    dateModeBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    durationModeBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    dateModeConfig.classList.remove('hidden');
                    durationModeConfig.classList.add('hidden');
                } else {
                    dateModeBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    durationModeBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    dateModeConfig.classList.add('hidden');
                    durationModeConfig.classList.remove('hidden');
                }
                
                this.updateGrowthForecast();
            }

            calculateDefaultDates(plantDate) {
                const startDate = new Date(plantDate);
                
                // Vegetation: start from plant date
                const vegStart = new Date(startDate);
                const vegEnd = new Date(startDate);
                vegEnd.setDate(vegStart.getDate() + 27); // 28 days
                
                // Flowering: start after vegetation
                const flowerStart = new Date(vegEnd);
                flowerStart.setDate(vegEnd.getDate() + 1);
                const flowerEnd = new Date(flowerStart);
                flowerEnd.setDate(flowerStart.getDate() + 62); // 63 days
                
                // Drying: start after flowering
                const dryStart = new Date(flowerEnd);
                dryStart.setDate(flowerEnd.getDate() + 1);
                const dryEnd = new Date(dryStart);
                dryEnd.setDate(dryStart.getDate() + 9); // 10 days
                
                document.getElementById('veg-start-date').value = vegStart.toISOString().split('T')[0];
                document.getElementById('veg-end-date').value = vegEnd.toISOString().split('T')[0];
                document.getElementById('flower-start-date').value = flowerStart.toISOString().split('T')[0];
                document.getElementById('flower-end-date').value = flowerEnd.toISOString().split('T')[0];
                document.getElementById('dry-start-date').value = dryStart.toISOString().split('T')[0];
                document.getElementById('dry-end-date').value = dryEnd.toISOString().split('T')[0];
                
                this.updatePhaseDurations();
            }

            addPhaseInputListeners() {
                // Duration mode listeners
                ['veg-duration', 'flower-duration', 'dry-duration', 'plant-date'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.addEventListener('input', () => this.updateGrowthForecast());
                    }
                });
                
                // Date mode listeners
                ['veg-start-date', 'veg-end-date', 'flower-start-date', 'flower-end-date', 'dry-start-date', 'dry-end-date'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.addEventListener('input', () => {
                            this.updatePhaseDurations();
                            this.updateGrowthForecast();
                        });
                    }
                });
                
                // Plant date change should update default dates in date mode
                const plantDateInput = document.getElementById('plant-date');
                if (plantDateInput) {
                    plantDateInput.addEventListener('input', (e) => {
                        if (this.currentPhaseMode === 'dates' && !this.currentPlantId) {
                            this.calculateDefaultDates(e.target.value);
                        }
                        this.updateGrowthForecast();
                    });
                }
            }

            updatePhaseDurations() {
                // Update duration displays for date mode
                const vegStart = document.getElementById('veg-start-date').value;
                const vegEnd = document.getElementById('veg-end-date').value;
                const flowerStart = document.getElementById('flower-start-date').value;
                const flowerEnd = document.getElementById('flower-end-date').value;
                const dryStart = document.getElementById('dry-start-date').value;
                const dryEnd = document.getElementById('dry-end-date').value;
                
                if (vegStart && vegEnd) {
                    const days = this.calculateDaysBetween(vegStart, vegEnd) + 1;
                    document.getElementById('veg-duration-display').textContent = `Длительность: ${days} дней`;
                }
                
                if (flowerStart && flowerEnd) {
                    const days = this.calculateDaysBetween(flowerStart, flowerEnd) + 1;
                    document.getElementById('flower-duration-display').textContent = `Длительность: ${days} дней`;
                }
                
                if (dryStart && dryEnd) {
                    const days = this.calculateDaysBetween(dryStart, dryEnd) + 1;
                    document.getElementById('dry-duration-display').textContent = `Длительность: ${days} дней`;
                }
            }

            calculateDaysBetween(startDate, endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = end - start;
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }

            hidePlantModal() {
                document.getElementById('plant-modal').classList.add('hidden');
                this.currentPlantId = null;
            }

            updateGrowthForecast() {
                let vegStartDate, vegEndDate, flowerStartDate, flowerEndDate, dryStartDate, dryEndDate;
                let vegDuration, flowerDuration, dryDuration;

                if (this.currentPhaseMode === 'dates') {
                    // Date mode
                    vegStartDate = document.getElementById('veg-start-date').value;
                    vegEndDate = document.getElementById('veg-end-date').value;
                    flowerStartDate = document.getElementById('flower-start-date').value;
                    flowerEndDate = document.getElementById('flower-end-date').value;
                    dryStartDate = document.getElementById('dry-start-date').value;
                    dryEndDate = document.getElementById('dry-end-date').value;

                    if (!vegStartDate || !vegEndDate || !flowerStartDate || !flowerEndDate || !dryStartDate || !dryEndDate) {
                        return;
                    }

                    vegDuration = this.calculateDaysBetween(vegStartDate, vegEndDate) + 1;
                    flowerDuration = this.calculateDaysBetween(flowerStartDate, flowerEndDate) + 1;
                    dryDuration = this.calculateDaysBetween(dryStartDate, dryEndDate) + 1;
                } else {
                    // Duration mode
                    const plantDate = document.getElementById('plant-date').value;
                    if (!plantDate) return;

                    vegDuration = parseInt(document.getElementById('veg-duration').value) || 28;
                    flowerDuration = parseInt(document.getElementById('flower-duration').value) || 63;
                    dryDuration = parseInt(document.getElementById('dry-duration').value) || 10;

                    const startDate = new Date(plantDate);
                    vegStartDate = plantDate;
                    
                    const vegEnd = new Date(startDate.getTime() + (vegDuration - 1) * 24 * 60 * 60 * 1000);
                    vegEndDate = vegEnd.toISOString().split('T')[0];

                    const flowerStart = new Date(vegEnd.getTime() + 24 * 60 * 60 * 1000);
                    flowerStartDate = flowerStart.toISOString().split('T')[0];
                    
                    const flowerEnd = new Date(flowerStart.getTime() + (flowerDuration - 1) * 24 * 60 * 60 * 1000);
                    flowerEndDate = flowerEnd.toISOString().split('T')[0];

                    const dryStart = new Date(flowerEnd.getTime() + 24 * 60 * 60 * 1000);
                    dryStartDate = dryStart.toISOString().split('T')[0];
                    
                    const dryEnd = new Date(dryStart.getTime() + (dryDuration - 1) * 24 * 60 * 60 * 1000);
                    dryEndDate = dryEnd.toISOString().split('T')[0];
                }
                
                const totalDays = vegDuration + flowerDuration + dryDuration;
                const totalWeeks = (totalDays / 7).toFixed(1);
                
                const forecastContainer = document.getElementById('growth-forecast');
                forecastContainer.innerHTML = `
                    <!-- Vegetation Phase -->
                    <div class="flex items-center justify-between p-3 bg-green-600/20 rounded-lg border-l-4 border-green-400">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">🌱</span>
                            <div>
                                <div class="font-medium text-green-400">Вегетация</div>
                                <div class="text-sm text-gray-300">Дни 1-${vegDuration} (18/6)</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-300">${this.formatDateString(vegStartDate)} - ${this.formatDateString(vegEndDate)}</div>
                            <div class="text-xs text-green-400">${vegDuration} дней</div>
                        </div>
                    </div>
                    
                    <!-- Flowering Phase -->
                    <div class="flex items-center justify-between p-3 bg-purple-600/20 rounded-lg border-l-4 border-purple-400">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">🌸</span>
                            <div>
                                <div class="font-medium text-purple-400">Цветение</div>
                                <div class="text-sm text-gray-300">Дни ${vegDuration + 1}-${vegDuration + flowerDuration} (12/12)</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-300">${this.formatDateString(flowerStartDate)} - ${this.formatDateString(flowerEndDate)}</div>
                            <div class="text-xs text-purple-400">${flowerDuration} дней</div>
                        </div>
                    </div>
                    
                    <!-- Drying Phase -->
                    <div class="flex items-center justify-between p-3 bg-orange-600/20 rounded-lg border-l-4 border-orange-400">
                        <div class="flex items-center gap-3">
                            <span class="text-xl">🍂</span>
                            <div>
                                <div class="font-medium text-orange-400">Сушка</div>
                                <div class="text-sm text-gray-300">Дни ${vegDuration + flowerDuration + 1}-${totalDays} (0/24)</div>
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-gray-300">${this.formatDateString(dryStartDate)} - ${this.formatDateString(dryEndDate)}</div>
                            <div class="text-xs text-orange-400">${dryDuration} дней</div>
                        </div>
                    </div>
                `;
                
                document.getElementById('total-cycle-days').textContent = totalDays;
                document.getElementById('total-cycle-weeks').textContent = totalWeeks;
                document.getElementById('estimated-harvest-date').textContent = this.formatDateString(dryEndDate);
            }

            formatDateString(dateString) {
                if (!dateString) return '-';
                const date = new Date(dateString);
                return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }

            formatDate(date) {
                return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }

            handlePlantForm(e) {
                e.preventDefault();
                
                const plantData = {
                    name: document.getElementById('plant-name').value.trim(),
                    plantDate: document.getElementById('plant-date').value,
                    strain: document.getElementById('plant-strain').value.trim(),
                    species: document.getElementById('plant-species').value.trim(),
                    substrate: document.getElementById('plant-substrate').value.trim(),
                    lightOnTime: document.getElementById('plant-light-on').value || '08:00',
                    image: this.getPlantImageData()
                };

                // Collect growth phases data based on current mode
                if (this.currentPhaseMode === 'dates') {
                    plantData.growthPhases = {
                        useDates: true,
                        vegStartDate: document.getElementById('veg-start-date').value,
                        vegEndDate: document.getElementById('veg-end-date').value,
                        flowerStartDate: document.getElementById('flower-start-date').value,
                        flowerEndDate: document.getElementById('flower-end-date').value,
                        dryStartDate: document.getElementById('dry-start-date').value,
                        dryEndDate: document.getElementById('dry-end-date').value
                    };
                } else {
                    plantData.growthPhases = {
                        useDates: false,
                        vegetation: parseInt(document.getElementById('veg-duration').value) || 28,
                        flowering: parseInt(document.getElementById('flower-duration').value) || 63,
                        drying: parseInt(document.getElementById('dry-duration').value) || 10
                    };
                }

                // Debug: Log form elements
                console.log('Form elements values:', {
                    name: document.getElementById('plant-name').value,
                    date: document.getElementById('plant-date').value,
                    strain: document.getElementById('plant-strain').value,
                    species: document.getElementById('plant-species').value,
                    substrate: document.getElementById('plant-substrate').value,
                    lightOn: document.getElementById('plant-light-on').value
                });

                // Validation
                if (!plantData.name || !plantData.plantDate) {
                    alert('⚠️ Заполните обязательные поля: название и дата посадки');
                    return;
                }

                try {
                    console.log('Plant form data:', plantData);
                    console.log('Current plant ID:', this.currentPlantId);
                    console.log('Existing plants count:', Object.keys(this.data.plants).length);

                    if (this.currentPlantId) {
                        console.log('Updating existing plant:', this.currentPlantId);
                        this.updatePlant(this.currentPlantId, plantData);
                        // Update light phases based on new growth phases
                        this.updatePlantLightPhases(this.currentPlantId, plantData);
                    } else {
                        console.log('Creating new plant');
                        const plantId = this.createPlant(plantData);
                        console.log('Plant created with ID:', plantId);
                        
                        // Auto-select the new plant
                        this.data.settings.selectedPlant = plantId;
                        
                        // Create light phases for new plant
                        this.createPlantLightPhases(plantId, plantData);
                        console.log('Light phases created for new plant');
                    }

                    // Force save and re-render
                    this.saveData();
                    console.log('Data saved. Plants count:', Object.keys(this.data.plants).length);
                    console.log('All plant IDs:', Object.keys(this.data.plants));
                    
                    this.hidePlantModal();
                    this.renderUI();
                    
                    this.showNotification('✅ Растение успешно сохранено', 'success');
                    console.log('Total light phases after plant creation/update:', Object.keys(this.data.lightPhases || {}).length);
                    
                } catch (error) {
                    console.error('Error saving plant:', error);
                    console.error('Error stack:', error.stack);
                    console.log('Data state during error:', {
                        plants: Object.keys(this.data.plants || {}),
                        lightPhases: Object.keys(this.data.lightPhases || {}),
                        currentPlantId: this.currentPlantId
                    });
                    alert('❌ Ошибка сохранения растения: ' + error.message);
                }
            }

            getPlantImageData() {
                const imageInput = document.getElementById('plant-image');
                const imageUrlInput = document.getElementById('plant-image-url');
                const previewImg = document.getElementById('plant-preview-img');
                
                // Если есть новый файл, возвращаем его как base64
                if (imageInput.files && imageInput.files[0]) {
                    return previewImg.src; // Уже в формате data URL
                }
                
                // Если есть URL изображения и превью показывает его
                if (imageUrlInput && imageUrlInput.value.trim() && previewImg.src === imageUrlInput.value.trim()) {
                    return imageUrlInput.value.trim();
                }
                
                // Если превью показывает существующее изображение, сохраняем его
                if (previewImg.src && previewImg.src !== '') {
                    return previewImg.src;
                }
                
                // Если изображения нет, возвращаем null
                return null;
            }

            showPlantImageModal(plantId) {
                const plant = this.data.plants[plantId];
                if (!plant || !plant.image) return;

                // Создаем модальное окно для просмотра изображения
                const modal = document.createElement('div');
                modal.id = 'plant-image-modal';
                modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="relative max-w-4xl max-h-[90vh] bg-dark rounded-lg overflow-hidden">
                        <div class="flex items-center justify-between p-4 border-b border-gray-600">
                            <h3 class="text-lg font-semibold">📸 ${plant.name}</h3>
                            <button id="close-image-modal" class="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="p-4">
                            <img src="${plant.image}" alt="${plant.name}" class="w-full h-auto max-h-[70vh] object-contain rounded-lg">
                            <div class="mt-4 text-center text-gray-400 text-sm">
                                ${plant.strain ? `${plant.strain} • ` : ''}День ${this.getDaysSincePlanting(plant.id, new Date())} с посадки
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Обработчики закрытия
                const closeBtn = modal.querySelector('#close-image-modal');
                const closeModal = () => {
                    modal.remove();
                };

                closeBtn.addEventListener('click', closeModal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeModal();
                });

                // Закрытие по Escape
                const escapeHandler = (e) => {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', escapeHandler);
                    }
                };
                document.addEventListener('keydown', escapeHandler);
            }

            showFertilizerImageModal(fertilizerId) {
                const fertilizer = this.data.fertilizers[fertilizerId];
                if (!fertilizer) return;

                // Используем изображение удобрения или дефолтное
                const imageUrl = fertilizer.image || '1nsfSKxFu5LKDqP7zoRtP';

                // Создаем модальное окно для просмотра изображения удобрения
                const modal = document.createElement('div');
                modal.id = 'fertilizer-image-modal';
                modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
                modal.innerHTML = `
                    <div class="relative max-w-4xl max-h-[90vh] bg-dark rounded-lg overflow-hidden">
                        <div class="flex items-center justify-between p-4 border-b border-gray-600">
                            <h3 class="text-lg font-semibold">🧪 ${fertilizer.name}</h3>
                            <button id="close-fertilizer-image-modal" class="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="p-4">
                            <img src="${imageUrl}" alt="${fertilizer.name}" class="w-full h-auto max-h-[70vh] object-contain rounded-lg">
                            <div class="mt-4 space-y-2">
                                <!-- NPK информация -->
                                <div class="flex items-center justify-center gap-6 text-sm">
                                    <div class="flex items-center gap-2">
                                        <span class="w-3 h-3 bg-blue-400 rounded"></span>
                                        <span class="text-blue-400 font-medium">N: ${fertilizer.npk.n}%</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-3 h-3 bg-yellow-400 rounded"></span>
                                        <span class="text-yellow-400 font-medium">P: ${fertilizer.npk.p}%</span>
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="w-3 h-3 bg-purple-400 rounded"></span>
                                        <span class="text-purple-400 font-medium">K: ${fertilizer.npk.k}%</span>
                                    </div>
                                </div>
                                <div class="text-center text-gray-400 text-sm">
                                    Плотность: ${fertilizer.density} г/мл
                                    ${fertilizer.microElements ? ` • Микроэлементы: ${fertilizer.microElements}` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                document.body.appendChild(modal);

                // Обработчики закрытия
                const closeBtn = modal.querySelector('#close-fertilizer-image-modal');
                const closeModal = () => {
                    modal.remove();
                };

                closeBtn.addEventListener('click', closeModal);
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) closeModal();
                });

                // Закрытие по Escape
                const escapeHandler = (e) => {
                    if (e.key === 'Escape') {
                        closeModal();
                        document.removeEventListener('keydown', escapeHandler);
                    }
                };
                document.addEventListener('keydown', escapeHandler);
            }

            editPlant(plantId) {
                this.showPlantModal(plantId);
            }

            deletePlantConfirm(plantId) {
                const plant = this.data.plants[plantId];
                if (confirm(`Удалить растение "${plant.name}"? Это действие нельзя отменить.`)) {
                    this.deletePlant(plantId);
                    this.renderUI();
                }
            }

            // Quick actions
            quickWater() {
                const plants = Object.values(this.data.plants);
                if (plants.length === 0) {
                    alert('Сначала добавьте растения');
                    return;
                }
                this.showWateringModal();
            }

            quickFeed() {
                const plants = Object.values(this.data.plants);
                if (plants.length === 0) {
                    alert('Сначала добавьте растения');
                    return;
                }
                alert('Подкормка выполнена для всех активных растений!');
            }

            // Fertilizer modal management
            showFertilizerModal(fertilizerId = null) {
                this.currentFertilizerId = fertilizerId;
                const modal = document.getElementById('fertilizer-modal');
                const title = document.getElementById('fertilizer-modal-title');
                const form = document.getElementById('fertilizer-form');
                
                if (fertilizerId) {
                    title.textContent = 'Редактировать удобрение';
                    const fertilizer = this.data.fertilizers[fertilizerId];
                    document.getElementById('fertilizer-name').value = fertilizer.name;
                    document.getElementById('fertilizer-n').value = fertilizer.npk.n;
                    document.getElementById('fertilizer-p').value = fertilizer.npk.p;
                    document.getElementById('fertilizer-k').value = fertilizer.npk.k;
                    document.getElementById('fertilizer-density').value = fertilizer.density;
                    document.getElementById('fertilizer-micro').value = fertilizer.microElements || '';
                    
                    // Отображаем текущее изображение если есть
                    if (fertilizer.image) {
                        const previewContainer = document.getElementById('fertilizer-image-preview');
                        const previewImg = document.getElementById('fertilizer-preview-img');
                        const imageUrlInput = document.getElementById('fertilizer-image-url');
                        
                        previewImg.src = fertilizer.image;
                        previewContainer.classList.remove('hidden');
                        
                        // Если это URL (не data URL), показываем в поле URL
                        if (fertilizer.image.startsWith('http')) {
                            imageUrlInput.value = fertilizer.image;
                            this.switchFertilizerUploadMode('url');
                        } else {
                            // Это base64 или относительная ссылка, показываем в файловом режиме
                            this.switchFertilizerUploadMode('file');
                        }
                    } else {
                        document.getElementById('fertilizer-image-preview').classList.add('hidden');
                        this.switchFertilizerUploadMode('file');
                    }
                    
                    // Сбрасываем input файла
                    document.getElementById('fertilizer-image').value = '';
                } else {
                    title.textContent = 'Добавить удобрение';
                    form.reset();
                    document.getElementById('fertilizer-density').value = '1.0';
                    
                    // Скрываем превью изображения
                    document.getElementById('fertilizer-image-preview').classList.add('hidden');
                }
                
                // Setup image handlers
                this.setupFertilizerImageHandlers();
                
                modal.classList.remove('hidden');
            }

            hideFertilizerModal() {
                document.getElementById('fertilizer-modal').classList.add('hidden');
                this.currentFertilizerId = null;
            }

            setupFertilizerImageHandlers() {
                const imageInput = document.getElementById('fertilizer-image');
                const imageUrlInput = document.getElementById('fertilizer-image-url');
                const previewContainer = document.getElementById('fertilizer-image-preview');
                const previewImg = document.getElementById('fertilizer-preview-img');
                const removeBtn = document.getElementById('remove-fertilizer-image');
                
                // Tab switching
                const fileBtn = document.getElementById('fertilizer-upload-file-btn');
                const urlBtn = document.getElementById('fertilizer-upload-url-btn');
                const loadUrlBtn = document.getElementById('load-fertilizer-image-url');

                fileBtn.addEventListener('click', () => this.switchFertilizerUploadMode('file'));
                urlBtn.addEventListener('click', () => this.switchFertilizerUploadMode('url'));

                // Обработчик загрузки файла
                imageInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;

                    // Проверяем размер файла (5MB)
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Размер файла слишком большой. Максимальный размер: 5MB');
                        imageInput.value = '';
                        return;
                    }

                    // Проверяем тип файла
                    if (!file.type.startsWith('image/')) {
                        alert('Пожалуйста, выберите изображение');
                        imageInput.value = '';
                        return;
                    }

                    // Читаем файл и показываем превью
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        previewImg.src = e.target.result;
                        previewContainer.classList.remove('hidden');
                        // Clear URL input when file is loaded
                        if (imageUrlInput) imageUrlInput.value = '';
                    };
                    reader.readAsDataURL(file);
                });

                // Обработчик загрузки по URL
                if (loadUrlBtn) {
                    loadUrlBtn.addEventListener('click', () => this.loadFertilizerImageFromUrl());
                }

                // Обработчик удаления изображения
                removeBtn.addEventListener('click', () => {
                    imageInput.value = '';
                    if (imageUrlInput) imageUrlInput.value = '';
                    previewContainer.classList.add('hidden');
                    previewImg.src = '';
                });
            }

            switchFertilizerUploadMode(mode) {
                const fileBtn = document.getElementById('fertilizer-upload-file-btn');
                const urlBtn = document.getElementById('fertilizer-upload-url-btn');
                const fileUpload = document.getElementById('fertilizer-file-upload');
                const urlUpload = document.getElementById('fertilizer-url-upload');

                if (mode === 'file') {
                    fileBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    urlBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    fileUpload.classList.remove('hidden');
                    urlUpload.classList.add('hidden');
                } else {
                    fileBtn.className = 'px-3 py-1 bg-gray-700 text-white rounded text-sm';
                    urlBtn.className = 'px-3 py-1 bg-primary text-darker rounded text-sm font-medium';
                    fileUpload.classList.add('hidden');
                    urlUpload.classList.remove('hidden');
                }
            }

            async loadFertilizerImageFromUrl() {
                const imageUrlInput = document.getElementById('fertilizer-image-url');
                const previewContainer = document.getElementById('fertilizer-image-preview');
                const previewImg = document.getElementById('fertilizer-preview-img');
                const loadBtn = document.getElementById('load-fertilizer-image-url');
                
                const originalUrl = imageUrlInput.value.trim();
                if (!originalUrl) {
                    alert('Введите URL изображения');
                    return;
                }

                // Normalize and validate URL
                const url = this.normalizeImageUrl(originalUrl);
                
                try {
                    new URL(url);
                } catch {
                    alert('Некорректный URL. Проверьте правильность введенной ссылки.');
                    return;
                }

                // Check if URL looks like an image
                if (!this.isImageUrl(url)) {
                    const confirmMessage = 'URL не похож на прямую ссылку на изображение.\n\n' +
                        'Для лучшей совместимости используйте URL, заканчивающиеся на:\n' +
                        '.jpg, .png, .webp, .gif\n\n' +
                        'Всё равно попробовать загрузить?';
                    
                    if (!confirm(confirmMessage)) {
                        return;
                    }
                }

                // Show loading state
                loadBtn.textContent = 'Загрузка...';
                loadBtn.disabled = true;

                try {
                    // Try to load image without CORS first (most permissive)
                    const testImg = new Image();
                    
                    await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout: изображение не загрузилось за 10 секунд'));
                        }, 10000);
                        
                        testImg.onload = () => {
                            clearTimeout(timeout);
                            resolve();
                        };
                        
                        testImg.onerror = () => {
                            clearTimeout(timeout);
                            reject(new Error('Не удается загрузить изображение'));
                        };
                        
                        // Try without CORS first, then with
                        testImg.src = url;
                    });

                    // If successful, show preview
                    previewImg.src = url;
                    previewContainer.classList.remove('hidden');
                    
                    // Clear file input when URL is loaded
                    document.getElementById('fertilizer-image').value = '';
                    
                    // Show success message
                    this.showNotification('✅ Изображение загружено успешно', 'success');
                    
                } catch (error) {
                    console.log('Image load error:', error);
                    
                    // More detailed error message
                    let errorMessage = 'Не удалось загрузить изображение по указанной ссылке.\n\n';
                    
                    if (error.message.includes('Timeout')) {
                        errorMessage += '⏱️ Превышено время ожидания загрузки.\n';
                    } else {
                        errorMessage += '❌ Ошибка загрузки изображения.\n';
                    }
                    
                    errorMessage += '\n💡 Возможные причины:\n';
                    errorMessage += '• URL не является прямой ссылкой на изображение\n';
                    errorMessage += '• Сервер блокирует загрузку (CORS)\n';
                    errorMessage += '• Изображение недоступно или удалено\n';
                    errorMessage += '• Медленное интернет-соединение\n\n';
                    errorMessage += '🔧 Решения:\n';
                    errorMessage += '• Используйте прямые ссылки (.jpg, .png, .webp)\n';
                    errorMessage += '• Попробуйте другой хостинг изображений\n';
                    errorMessage += '• Скачайте и загрузите файл через вкладку "Файл"';
                    
                    alert(errorMessage);
                } finally {
                    // Restore button state
                    loadBtn.textContent = 'Загрузить по ссылке';
                    loadBtn.disabled = false;
                }
            }

            getFertilizerImageData() {
                const imageInput = document.getElementById('fertilizer-image');
                const imageUrlInput = document.getElementById('fertilizer-image-url');
                const previewImg = document.getElementById('fertilizer-preview-img');
                
                // Если есть новый файл, возвращаем его как base64
                if (imageInput.files && imageInput.files[0]) {
                    return previewImg.src; // Уже в формате data URL
                }
                
                // Если есть URL изображения и превью показывает его
                if (imageUrlInput.value.trim() && previewImg.src === imageUrlInput.value.trim()) {
                    return imageUrlInput.value.trim();
                }
                
                // Если превью показывает существующее изображение, сохраняем его
                if (previewImg.src && previewImg.src !== '') {
                    return previewImg.src;
                }
                
                // Если изображения нет, возвращаем null
                return null;
            }

            handleFertilizerForm(e) {
                e.preventDefault();
                const fertilizerData = {
                    name: document.getElementById('fertilizer-name').value,
                    npk: {
                        n: parseFloat(document.getElementById('fertilizer-n').value),
                        p: parseFloat(document.getElementById('fertilizer-p').value),
                        k: parseFloat(document.getElementById('fertilizer-k').value)
                    },
                    density: parseFloat(document.getElementById('fertilizer-density').value),
                    microElements: document.getElementById('fertilizer-micro').value,
                    image: this.getFertilizerImageData()
                };

                if (this.currentFertilizerId) {
                    this.data.fertilizers[this.currentFertilizerId] = {
                        ...this.data.fertilizers[this.currentFertilizerId],
                        ...fertilizerData
                    };
                } else {
                    const id = 'fertilizer-' + Date.now();
                    this.data.fertilizers[id] = { id, ...fertilizerData };
                }

                this.saveData();
                this.hideFertilizerModal();
                this.renderFertilizers();
            }

            editFertilizer(fertilizerId) {
                this.showFertilizerModal(fertilizerId);
            }

            deleteFertilizerConfirm(fertilizerId) {
                const fertilizer = this.data.fertilizers[fertilizerId];
                if (confirm(`Удалить удобрение "${fertilizer.name}"?`)) {
                    delete this.data.fertilizers[fertilizerId];
                    this.saveData();
                    this.renderFertilizers();
                }
            }

            // Recipe modal management
            showRecipeModal(recipeId = null) {
                this.currentRecipeId = recipeId;
                const modal = document.getElementById('recipe-modal');
                const title = document.getElementById('recipe-modal-title');
                const form = document.getElementById('recipe-form');
                
                if (recipeId) {
                    title.textContent = 'Редактировать рецепт';
                    const recipe = this.data.recipes[recipeId];
                    document.getElementById('recipe-name').value = recipe.name;
                    document.getElementById('recipe-volume').value = recipe.volume;
                    this.renderRecipeFertilizers(recipe.fertilizers);
                } else {
                    title.textContent = 'Создать рецепт';
                    form.reset();
                    document.getElementById('recipe-volume').value = '1';
                    this.renderRecipeFertilizers([]);
                }
                
                modal.classList.remove('hidden');
                this.updateRecipeTotals();
            }

            hideRecipeModal() {
                document.getElementById('recipe-modal').classList.add('hidden');
                this.currentRecipeId = null;
            }

            renderRecipeFertilizers(fertilizers = []) {
                const container = document.getElementById('recipe-fertilizers');
                container.innerHTML = '';
                
                fertilizers.forEach((fert, index) => {
                    this.addRecipeFertilizerRow(fert.fertilizerId, fert.dose, index);
                });
                
                // Add event listener for adding more fertilizers
                document.getElementById('add-recipe-fertilizer-btn').onclick = () => this.addRecipeFertilizerRow();
            }

            addRecipeFertilizerRow(fertilizerId = '', dose = 0, index = null) {
                const container = document.getElementById('recipe-fertilizers');
                const rowIndex = index !== null ? index : container.children.length;
                
                const row = document.createElement('div');
                row.className = 'flex gap-2 items-center';
                row.innerHTML = `
                    <select class="flex-1 bg-gray-700 text-white p-2 rounded" name="fertilizers[${rowIndex}][id]" onchange="app.updateRecipeTotals()">
                        <option value="">Выберите удобрение</option>
                        ${Object.values(this.data.fertilizers).map(f => 
                            `<option value="${f.id}" ${f.id === fertilizerId ? 'selected' : ''}>${f.name}</option>`
                        ).join('')}
                    </select>
                    <input type="number" step="0.1" min="0" value="${dose}" 
                           class="w-20 bg-gray-700 text-white p-2 rounded" 
                           name="fertilizers[${rowIndex}][dose]" placeholder="мл/л"
                           onchange="app.updateRecipeTotals()">
                    <button type="button" onclick="this.parentElement.remove(); app.updateRecipeTotals();" 
                            class="p-2 bg-red-600 hover:bg-red-700 rounded">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                `;
                container.appendChild(row);
            }

            updateRecipeTotals() {
                const volume = parseFloat(document.getElementById('recipe-volume').value) || 1;
                const fertilizerRows = document.querySelectorAll('#recipe-fertilizers > div');
                let totals = { n: 0, p: 0, k: 0 };
                
                fertilizerRows.forEach(row => {
                    const fertilizerId = row.querySelector('select').value;
                    const dose = parseFloat(row.querySelector('input').value) || 0;
                    
                    if (fertilizerId && dose > 0) {
                        const fertilizer = this.data.fertilizers[fertilizerId];
                        if (fertilizer) {
                            totals.n += dose * fertilizer.density * fertilizer.npk.n * 10;
                            totals.p += dose * fertilizer.density * fertilizer.npk.p * 10;
                            totals.k += dose * fertilizer.density * fertilizer.npk.k * 10;
                        }
                    }
                });
                
                document.getElementById('recipe-totals').innerHTML = `
                    <div class="grid grid-cols-3 gap-4">
                        <div><span class="text-blue-400 font-medium">N:</span> ${totals.n.toFixed(1)} мг/л</div>
                        <div><span class="text-yellow-400 font-medium">P:</span> ${totals.p.toFixed(1)} мг/л</div>
                        <div><span class="text-purple-400 font-medium">K:</span> ${totals.k.toFixed(1)} мг/л</div>
                    </div>
                `;
            }

            handleRecipeForm(e) {
                e.preventDefault();
                const formData = new FormData(e.target);
                
                const recipeData = {
                    name: document.getElementById('recipe-name').value,
                    volume: parseFloat(document.getElementById('recipe-volume').value),
                    fertilizers: []
                };
                
                const fertilizerRows = document.querySelectorAll('#recipe-fertilizers > div');
                fertilizerRows.forEach(row => {
                    const fertilizerId = row.querySelector('select').value;
                    const dose = parseFloat(row.querySelector('input').value) || 0;
                    
                    if (fertilizerId && dose > 0) {
                        recipeData.fertilizers.push({ fertilizerId, dose });
                    }
                });

                if (this.currentRecipeId) {
                    this.data.recipes[this.currentRecipeId] = {
                        ...this.data.recipes[this.currentRecipeId],
                        ...recipeData
                    };
                } else {
                    const id = 'recipe-' + Date.now();
                    this.data.recipes[id] = { id, ...recipeData };
                }

                this.saveData();
                this.hideRecipeModal();
                this.renderRecipes();
            }

            editRecipe(recipeId) {
                this.showRecipeModal(recipeId);
            }

            deleteRecipeConfirm(recipeId) {
                const recipe = this.data.recipes[recipeId];
                if (confirm(`Удалить рецепт "${recipe.name}"?`)) {
                    delete this.data.recipes[recipeId];
                    this.saveData();
                    this.renderRecipes();
                }
            }

            // Watering modal management
            showWateringModal() {
                const modal = document.getElementById('watering-modal');
                
                // Set current date and time
                const now = new Date();
                now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                document.getElementById('watering-date').value = now.toISOString().slice(0, 16);
                
                // Render plants list
                this.renderWateringPlants();
                
                // Render recipes
                this.renderWateringRecipes();
                
                // Reset form
                document.getElementById('watering-volume').value = '5';
                document.getElementById('watering-notes').value = '';
                
                modal.classList.remove('hidden');
                this.updateWateringCalculation();
            }

            hideWateringModal() {
                document.getElementById('watering-modal').classList.add('hidden');
            }

            renderWateringPlants() {
                const container = document.getElementById('watering-plants');
                const plants = Object.values(this.data.plants);
                
                container.innerHTML = '';
                
                if (plants.length === 0) {
                    container.innerHTML = '<div class="text-gray-400 text-sm">Нет растений для полива</div>';
                    return;
                }
                
                plants.forEach(plant => {
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                    
                    const plantCheckbox = document.createElement('label');
                    plantCheckbox.className = 'flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors';
                    plantCheckbox.innerHTML = `
                        <input type="checkbox" name="selected-plants" value="${plant.id}" 
                               class="w-4 h-4 text-primary bg-gray-700 border-gray-600 rounded focus:ring-primary focus:ring-2" 
                               onchange="app.updateWateringCalculation()" checked>
                        <div class="flex-1">
                            <div class="font-medium">${plant.name}</div>
                            <div class="text-sm text-gray-400">
                                День ${daysSince} • ${currentPhase ? this.getPhaseShortName(currentPhase.type) : 'Неизвестная фаза'}
                                ${plant.strain ? ` • ${plant.strain}` : ''}
                            </div>
                        </div>
                        <div class="text-xs text-gray-500">
                            ${currentPhase ? this.getPhaseIcon(currentPhase.type) : '❓'}
                        </div>
                    `;
                    container.appendChild(plantCheckbox);
                });
            }

            renderWateringRecipes() {
                const select = document.getElementById('watering-recipe');
                const recipes = Object.values(this.data.recipes);
                
                select.innerHTML = '<option value="">Только вода</option>';
                
                recipes.forEach(recipe => {
                    const option = document.createElement('option');
                    option.value = recipe.id;
                    option.textContent = recipe.name;
                    select.appendChild(option);
                });
            }

            autoSelectRecipe() {
                const selectedPlants = this.getSelectedWateringPlants();
                if (selectedPlants.length === 0) {
                    return;
                }
                
                // Анализируем фазы и недели для всех выбранных растений
                const plantAnalysis = selectedPlants.map(plant => {
                    const phase = this.getCurrentLightPhase(plant.id, new Date());
                    if (!phase) return null;
                    
                    // Рассчитываем неделю в текущей фазе
                    const phaseStartDate = new Date(phase.startDate);
                    const currentDate = new Date();
                    const daysSincePhaseStart = Math.floor((currentDate - phaseStartDate) / (1000 * 60 * 60 * 24)) + 1;
                    const weekInPhase = Math.ceil(daysSincePhaseStart / 7);
                    
                    return {
                        plant: plant,
                        phase: phase.type,
                        week: weekInPhase,
                        daysInPhase: daysSincePhaseStart
                    };
                }).filter(analysis => analysis !== null);
                
                if (plantAnalysis.length === 0) {
                    return;
                }
                
                // Определяем доминирующую фазу и среднюю неделю
                const phaseWeeks = {};
                plantAnalysis.forEach(analysis => {
                    if (!phaseWeeks[analysis.phase]) {
                        phaseWeeks[analysis.phase] = [];
                    }
                    phaseWeeks[analysis.phase].push(analysis.week);
                });
                
                // Находим самую частую фазу
                let dominantPhase = null;
                let maxPlants = 0;
                Object.keys(phaseWeeks).forEach(phase => {
                    if (phaseWeeks[phase].length > maxPlants) {
                        maxPlants = phaseWeeks[phase].length;
                        dominantPhase = phase;
                    }
                });
                
                // Вычисляем среднюю неделю для доминирующей фазы
                const averageWeek = Math.round(
                    phaseWeeks[dominantPhase].reduce((sum, week) => sum + week, 0) / 
                    phaseWeeks[dominantPhase].length
                );
                
                // Подбираем наиболее подходящий рецепт
                let recommendedRecipe = null;
                const recipes = Object.values(this.data.recipes);
                
                if (dominantPhase === 'vegetation') {
                    // Логика для вегетации по неделям
                    if (averageWeek === 1) {
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('вег') && 
                            (r.name.includes('1') || r.name.toLowerCase().includes('первая'))
                        );
                    } else if (averageWeek === 2) {
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('вег') && 
                            (r.name.includes('2') || r.name.toLowerCase().includes('вторая'))
                        );
                    } else if (averageWeek === 3) {
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('вег') && 
                            (r.name.includes('3') || r.name.toLowerCase().includes('третья'))
                        );
                    } else if (averageWeek >= 4) {
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('вег') && 
                            (r.name.includes('4') || r.name.toLowerCase().includes('четвертая'))
                        );
                    }
                    
                    // Если не нашли точного соответствия, берем любой вегетативный
                    if (!recommendedRecipe) {
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('вег') || 
                            r.name.toLowerCase().includes('grow')
                        );
                    }
                    
                } else if (dominantPhase === 'flowering') {
                    // Логика для цветения по неделям
                    if (averageWeek <= 2) {
                        // 1-2 недели цветения
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('цвет') && 
                            (r.name.includes('1-2') || r.name.includes('1') || 
                             r.name.toLowerCase().includes('начал') ||
                             r.name.toLowerCase().includes('переход'))
                        );
                    } else if (averageWeek >= 3) {
                        // 3+ недели цветения
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('цвет') && 
                            (r.name.includes('3-8') || r.name.includes('3') || 
                             r.name.toLowerCase().includes('основн') ||
                             r.name.toLowerCase().includes('актив'))
                        );
                    }
                    
                    // Если не нашли точного соответствия, берем любой для цветения
                    if (!recommendedRecipe) {
                        recommendedRecipe = recipes.find(r => 
                            r.name.toLowerCase().includes('цвет') || 
                            r.name.toLowerCase().includes('bloom')
                        );
                    }
                } else if (dominantPhase === 'drying') {
                    // Для сушки рекомендуем только воду
                    document.getElementById('watering-recipe').value = '';
                    this.updateWateringCalculation();
                    return;
                }
                
                if (recommendedRecipe) {
                    document.getElementById('watering-recipe').value = recommendedRecipe.id;
                } else {
                    document.getElementById('watering-recipe').value = '';
                }
                
                this.updateWateringCalculation();
            }

            getSelectedWateringPlants() {
                const checkboxes = document.querySelectorAll('input[name="selected-plants"]:checked');
                return Array.from(checkboxes).map(checkbox => {
                    return this.data.plants[checkbox.value];
                }).filter(plant => plant);
            }

            updateWateringCalculation() {
                const recipeId = document.getElementById('watering-recipe').value;
                const volume = parseFloat(document.getElementById('watering-volume').value) || 1;
                
                const fertilizerAmountsContainer = document.getElementById('fertilizer-amounts');
                const nutrientValuesContainer = document.getElementById('nutrient-values');
                
                if (!recipeId) {
                    // Только вода
                    fertilizerAmountsContainer.innerHTML = '<div class="text-gray-400 text-sm">Только чистая вода, без удобрений</div>';
                    nutrientValuesContainer.innerHTML = `
                        <div><span class="text-blue-400 font-medium">N:</span> 0 мг/л</div>
                        <div><span class="text-yellow-400 font-medium">P:</span> 0 мг/л</div>
                        <div><span class="text-purple-400 font-medium">K:</span> 0 мг/л</div>
                    `;
                    return;
                }
                
                const recipe = this.data.recipes[recipeId];
                if (!recipe) return;
                
                // Рассчитываем количества удобрений
                const fertilizers = [];
                let totalN = 0, totalP = 0, totalK = 0;
                
                recipe.fertilizers.forEach(fert => {
                    const fertilizer = this.data.fertilizers[fert.fertilizerId];
                    if (fertilizer) {
                        const totalAmount = (fert.dose * volume).toFixed(1);
                        fertilizers.push({
                            name: fertilizer.name,
                            amount: totalAmount,
                            unit: 'мл'
                        });
                        
                        // Рассчитываем питательные вещества
                        totalN += fert.dose * fertilizer.density * fertilizer.npk.n * 10;
                        totalP += fert.dose * fertilizer.density * fertilizer.npk.p * 10;
                        totalK += fert.dose * fertilizer.density * fertilizer.npk.k * 10;
                    }
                });
                
                // Отображаем количества удобрений
                fertilizerAmountsContainer.innerHTML = fertilizers.map(fert => `
                    <div class="flex justify-between items-center p-2 bg-gray-700 rounded">
                        <span class="font-medium">${fert.name}</span>
                        <span class="text-primary font-mono">${fert.amount} ${fert.unit}</span>
                    </div>
                `).join('');
                
                // Отображаем концентрации питательных веществ
                nutrientValuesContainer.innerHTML = `
                    <div><span class="text-blue-400 font-medium">N:</span> ${totalN.toFixed(1)} мг/л</div>
                    <div><span class="text-yellow-400 font-medium">P:</span> ${totalP.toFixed(1)} мг/л</div>
                    <div><span class="text-purple-400 font-medium">K:</span> ${totalK.toFixed(1)} мг/л</div>
                `;
            }

            handleWateringForm(e) {
                e.preventDefault();
                
                const selectedPlants = this.getSelectedWateringPlants();
                if (selectedPlants.length === 0) {
                    alert('Выберите хотя бы одно растение для полива');
                    return;
                }
                
                const wateringData = {
                    date: document.getElementById('watering-date').value,
                    volume: parseFloat(document.getElementById('watering-volume').value),
                    recipeId: document.getElementById('watering-recipe').value || null,
                    plantIds: selectedPlants.map(plant => plant.id),
                    notes: document.getElementById('watering-notes').value,
                    createdAt: new Date().toISOString()
                };
                
                // Сохраняем полив в историю
                const wateringId = 'watering-' + Date.now();
                this.data.wateringHistory[wateringId] = {
                    id: wateringId,
                    ...wateringData
                };
                
                this.saveData();
                this.hideWateringModal();
                this.renderUI();
            }

            // Watering History Management
            deleteWateringConfirm(wateringId) {
                const watering = this.data.wateringHistory[wateringId];
                if (!watering) return;

                const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                const date = new Date(watering.date).toLocaleDateString('ru-RU');
                const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                const plantsNames = watering.plantIds.map(id => this.data.plants[id]?.name || 'Неизвестное растение').join(', ');
                
                const confirmMessage = `Удалить запись о поливе?\n\n` +
                    `📅 Дата: ${date} в ${time}\n` +
                    `🌿 Растения: ${plantsNames}\n` +
                    `💧 Объем: ${watering.volume}л\n` +
                    `${recipe ? `🧪 Рецепт: ${recipe.name}\n` : '💧 Только вода\n'}` +
                    `${watering.notes ? `📝 Заметки: ${watering.notes}\n` : ''}\n` +
                    `⚠️ Это действие нельзя отменить!`;

                if (confirm(confirmMessage)) {
                    this.deleteWatering(wateringId);
                }
            }

            deleteWatering(wateringId) {
                delete this.data.wateringHistory[wateringId];
                this.saveData();
                this.renderUI();
                this.renderCalendar(); // Обновляем календарь для отображения изменений
                
                alert('✅ Запись о поливе удалена');
            }

            // Settings Management
            showSettingsModal() {
                const modal = document.getElementById('settings-modal');
                
                // Load current settings
                document.getElementById('settings-app-title').value = this.data.settings.appTitle || 'Plant Care Pro';
                
                // Home Assistant settings
                const haSettings = this.data.settings.homeAssistant || {};
                document.getElementById('settings-ha-enabled').checked = haSettings.enabled || false;
                document.getElementById('settings-ha-url').value = haSettings.url || '';
                document.getElementById('settings-ha-token').value = haSettings.accessToken || '';
                document.getElementById('settings-ha-prefix').value = haSettings.entityPrefix || 'plant_care';
                
                // Show/hide Home Assistant settings
                this.toggleHomeAssistantSettings(haSettings.enabled || false);

                // Telegram settings
                const telegramSettings = this.data.settings.telegram || {};
                document.getElementById('settings-telegram-enabled').checked = telegramSettings.enabled || false;
                document.getElementById('settings-telegram-token').value = telegramSettings.botToken || '';
                document.getElementById('settings-telegram-chat-id').value = telegramSettings.chatId || '';
                
                // Telegram notification settings
                const notifications = telegramSettings.notifications || {};
                document.getElementById('settings-telegram-watering-reminders').checked = notifications.wateringReminders !== false;
                document.getElementById('settings-telegram-phase-changes').checked = notifications.phaseChanges !== false;
                document.getElementById('settings-telegram-daily-summary').checked = notifications.dailySummary || false;
                document.getElementById('settings-telegram-daily-time').value = notifications.dailyTime || '09:00';
                
                // Telegram backup settings
                document.getElementById('settings-telegram-auto-backup').checked = telegramSettings.autoBackup || false;
                document.getElementById('settings-telegram-backup-frequency').value = telegramSettings.backupFrequency || 'weekly';
                document.getElementById('settings-telegram-backup-time').value = telegramSettings.backupTime || '20:00';
                
                // Show last Telegram backup time
                if (telegramSettings.lastBackupTime) {
                    const lastBackup = new Date(telegramSettings.lastBackupTime);
                    const lastBackupElement = document.getElementById('last-telegram-backup-time');
                    if (lastBackupElement) {
                        lastBackupElement.textContent = lastBackup.toLocaleString('ru-RU');
                    }
                }
                
                // Show/hide Telegram settings
                this.toggleTelegramSettings(telegramSettings.enabled || false);
                this.toggleDailySummaryTime(notifications.dailySummary || false);
                this.toggleTelegramBackupSettings(telegramSettings.autoBackup || false);

                // Backup settings (removed from UI but keep data compatibility)
                const backupSettings = this.data.settings.backup || {};
                
                // Update stats
                this.updateSettingsStats();
                
                modal.classList.remove('hidden');
            }

            hideSettingsModal() {
                document.getElementById('settings-modal').classList.add('hidden');
            }

            toggleHomeAssistantSettings(enabled) {
                const content = document.getElementById('ha-settings-content');
                if (enabled) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            }

            toggleTelegramSettings(enabled) {
                const content = document.getElementById('telegram-settings-content');
                if (content) {
                    if (enabled) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                }
            }

            getPhaseDisplayName(type) {
                switch (type) {
                    case 'vegetation': return 'Вегетация';
                    case 'flowering': return 'Цветение';
                    case 'drying': return 'Сушка';
                    default: return 'Неизвестно';
                }
            }

            getPhaseShortName(type) {
                switch (type) {
                    case 'vegetation': return 'Вегетация';
                    case 'flowering': return 'Цветение';
                    case 'drying': return 'Сушка';
                    default: return 'Неизвестно';
                }
            }

            getPhaseIcon(type) {
                switch (type) {
                    case 'vegetation': return '🌱';
                    case 'flowering': return '🌸';
                    case 'drying': return '🍂';
                    default: return '❓';
                }
            }

            isPlantActive(plant) {
                if (!plant) return false;
                
                const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                
                if (currentPhase) {
                    if (currentPhase.type === 'drying') {
                        const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                        const totalVegFlower = (plant.growthPhases?.vegetation || 28) + (plant.growthPhases?.flowering || 63);
                        const dryingDays = plant.growthPhases?.drying || 10;
                        
                        return daysSince < (totalVegFlower + dryingDays);
                    }
                    return true;
                }
                
                return true;
            }

            getLastWateringDate(plantId) {
                const waterings = Object.values(this.data.wateringHistory || {})
                    .filter(w => w.plantIds && w.plantIds.includes(plantId))
                    .sort((a, b) => new Date(b.date) - new Date(a.date));
                
                return waterings.length > 0 ? waterings[0].date : null;
            }

            getDaysSinceLastWatering(plantId) {
                const lastWatering = this.getLastWateringDate(plantId);
                if (!lastWatering) return 999;
                
                return Math.floor((new Date() - new Date(lastWatering)) / (1000 * 60 * 60 * 24));
            }

            needsWatering(plantId) {
                const lastWatering = this.getLastWateringDate(plantId);
                if (!lastWatering) return true;

                const daysSince = Math.floor((new Date() - new Date(lastWatering)) / (1000 * 60 * 60 * 24));
                const currentPhase = this.getCurrentLightPhase(plantId, new Date());
                
                if (currentPhase && currentPhase.type === 'drying') {
                    return false; // No watering during drying phase
                }
                
                return daysSince >= 3; // Default 3 days
            }

            handleSettingsForm(e) {
                e.preventDefault();
                
                // Save general settings
                const newTitle = document.getElementById('settings-app-title').value;
                this.data.settings.appTitle = newTitle;
                
                // Save Home Assistant settings
                this.data.settings.homeAssistant = {
                    enabled: document.getElementById('settings-ha-enabled').checked,
                    url: document.getElementById('settings-ha-url').value.trim(),
                    accessToken: document.getElementById('settings-ha-token').value.trim(),
                    entityPrefix: document.getElementById('settings-ha-prefix').value.trim() || 'plant_care'
                };

                // Save Telegram settings
                this.data.settings.telegram = {
                    enabled: document.getElementById('settings-telegram-enabled').checked,
                    botToken: document.getElementById('settings-telegram-token').value.trim(),
                    chatId: document.getElementById('settings-telegram-chat-id').value.trim(),
                    notifications: {
                        wateringReminders: document.getElementById('settings-telegram-watering-reminders').checked,
                        phaseChanges: document.getElementById('settings-telegram-phase-changes').checked,
                        dailySummary: document.getElementById('settings-telegram-daily-summary').checked,
                        dailyTime: document.getElementById('settings-telegram-daily-time').value || '09:00'
                    },
                    autoBackup: document.getElementById('settings-telegram-auto-backup').checked,
                    backupFrequency: document.getElementById('settings-telegram-backup-frequency').value || 'weekly',
                    backupTime: document.getElementById('settings-telegram-backup-time').value || '20:00',
                    lastDailySummary: this.data.settings.telegram?.lastDailySummary || null,
                    lastBackupTime: this.data.settings.telegram?.lastBackupTime || null
                };

                this.saveData();
                this.hideSettingsModal();
                this.updateAppTitle();
                

                
                // Setup Telegram notifications if enabled
                if (this.data.settings.telegram.enabled) {
                    this.setupTelegramNotifications();
                    
                    // Setup Telegram backup if enabled
                    if (this.data.settings.telegram.autoBackup) {
                        this.setupTelegramBackupSchedule();
                    }
                }
                
                // Show success message
                this.showNotification('✅ Настройки сохранены', 'success');
            }

            toggleAutoBackupSettings(enabled) {
                const content = document.getElementById('auto-backup-settings');
                if (enabled) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            }

            // File System Access API methods
            async selectBackupFolder() {
                if (!('showDirectoryPicker' in window)) {
                    alert('❌ Ваш браузер не поддерживает выбор папок.\n\nИспользуйте Chrome/Edge 86+ или другой современный браузер.');
                    return;
                }

                try {
                    const directoryHandle = await window.showDirectoryPicker({
                        mode: 'readwrite'
                    });

                    // Store folder handle and name
                    this.backupFolderHandle = directoryHandle;
                    this.data.settings.backup.folderName = directoryHandle.name;
                    
                    // Update UI
                    document.getElementById('settings-backup-folder').value = directoryHandle.name;
                    
                    this.showNotification('✅ Папка для бэкапов выбрана', 'success');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error selecting folder:', error);
                        this.showNotification('❌ Ошибка выбора папки', 'error');
                    }
                }
            }

            async backupToConfigFile() {
                try {
                    // Generate config content
                    const configContent = this.generateConfigContent();

                    // Save config.txt to the server/website storage
                    const response = await fetch('/api/save-config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            filename: 'config.txt',
                            content: configContent,
                            timestamp: new Date().toISOString()
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        this.showNotification('✅ Config.txt сохранен на сервере', 'success');
                        
                        // Update last backup time
                        this.data.settings.backup = this.data.settings.backup || {};
                        this.data.settings.backup.lastConfigBackup = new Date().toISOString();
                        this.saveData();
                    } else {
                        throw new Error(`Server error: ${response.status} ${response.statusText}`);
                    }

                } catch (error) {
                    console.error('Error saving config to server:', error);
                    
                    // Fallback to localStorage if server not available
                    try {
                        const configContent = this.generateConfigContent();
                        localStorage.setItem('plant-care-config-backup', configContent);
                        localStorage.setItem('plant-care-config-backup-time', new Date().toISOString());
                        
                        this.showNotification('⚠️ Сохранено локально (сервер недоступен)', 'warning');
                    } catch (fallbackError) {
                        console.error('Fallback error:', fallbackError);
                        this.showNotification('❌ Ошибка сохранения config.txt', 'error');
                    }
                }
            }

            generateConfigContent() {
                const now = new Date();
                const plants = Object.values(this.data.plants);
                const recipes = Object.values(this.data.recipes);
                const fertilizers = Object.values(this.data.fertilizers);
                
                let config = '';
                config += '# =============================================================================\n';
                config += '#                           PLANT CARE PRO CONFIG\n';
                config += '# =============================================================================\n';
                config += `# Создано: ${now.toLocaleString('ru-RU')}\n`;
                config += `# Версия: 1.0.0 Final\n`;
                config += `# Всего растений: ${plants.length}\n`;
                config += `# Всего удобрений: ${fertilizers.length}\n`;
                config += `# Всего рецептов: ${recipes.length}\n`;
                config += '# =============================================================================\n\n';

                // App Settings
                config += '# --- НАСТРОЙКИ ПРИЛОЖЕНИЯ ---\n';
                config += `APP_TITLE=${this.data.settings.appTitle || 'Plant Care Pro'}\n`;
                config += `CURRENT_DATE=${this.data.settings.currentDate.toISOString().split('T')[0]}\n`;
                config += `SELECTED_PLANT=${this.data.settings.selectedPlant || ''}\n\n`;

                // Home Assistant Integration
                if (this.data.settings.homeAssistant) {
                    config += '# --- HOME ASSISTANT ИНТЕГРАЦИЯ ---\n';
                    config += `HA_ENABLED=${this.data.settings.homeAssistant.enabled}\n`;
                    config += `HA_URL=${this.data.settings.homeAssistant.url || ''}\n`;
                    config += `HA_TOKEN=${this.data.settings.homeAssistant.accessToken ? '[СКРЫТО]' : ''}\n`;
                    config += `HA_PREFIX=${this.data.settings.homeAssistant.entityPrefix || 'plant_care'}\n\n`;
                }

                // Backup Settings
                if (this.data.settings.backup) {
                    config += '# --- НАСТРОЙКИ БЭКАПА ---\n';
                    config += `BACKUP_AUTO_ENABLED=${this.data.settings.backup.autoEnabled || false}\n`;
                    config += `BACKUP_FREQUENCY=${this.data.settings.backup.frequency || 'weekly'}\n`;
                    config += `BACKUP_KEEP_FILES=${this.data.settings.backup.keepFiles || 10}\n`;
                    config += `BACKUP_FOLDER=${this.data.settings.backup.folderName || ''}\n`;
                    config += `LAST_BACKUP=${this.data.settings.backup.lastBackupTime || 'никогда'}\n\n`;
                }

                // Plants Section
                config += '# =============================================================================\n';
                config += '#                                РАСТЕНИЯ\n';
                config += '# =============================================================================\n\n';

                plants.forEach((plant, index) => {
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                    const needsWatering = this.needsWatering(plant.id);
                    const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                    
                    config += `# --- РАСТЕНИЕ ${index + 1}: ${plant.name.toUpperCase()} ---\n`;
                    config += `PLANT_${index + 1}_ID=${plant.id}\n`;
                    config += `PLANT_${index + 1}_NAME=${plant.name}\n`;
                    config += `PLANT_${index + 1}_STRAIN=${plant.strain || ''}\n`;
                    config += `PLANT_${index + 1}_SPECIES=${plant.species || ''}\n`;
                    config += `PLANT_${index + 1}_SUBSTRATE=${plant.substrate || ''}\n`;
                    config += `PLANT_${index + 1}_PLANT_DATE=${plant.plantDate}\n`;
                    config += `PLANT_${index + 1}_LIGHT_ON=${plant.lightOnTime || '08:00'}\n`;
                    config += `PLANT_${index + 1}_DAY_SINCE_PLANTING=${daysSince}\n`;
                    config += `PLANT_${index + 1}_CURRENT_PHASE=${currentPhase ? currentPhase.type : 'unknown'}\n`;
                    config += `PLANT_${index + 1}_PHASE_NAME=${currentPhase ? this.getPhaseDisplayName(currentPhase.type) : 'Неизвестно'}\n`;
                    config += `PLANT_${index + 1}_NEEDS_WATERING=${needsWatering}\n`;
                    config += `PLANT_${index + 1}_DAYS_SINCE_WATERING=${daysSinceWatering}\n`;
                    config += `PLANT_${index + 1}_IS_ACTIVE=${this.isPlantActive(plant)}\n`;
                    
                    // Growth phases
                    if (plant.growthPhases) {
                        config += `PLANT_${index + 1}_USE_DATES=${plant.growthPhases.useDates || false}\n`;
                        if (plant.growthPhases.useDates) {
                            config += `PLANT_${index + 1}_VEG_START=${plant.growthPhases.vegStartDate || ''}\n`;
                            config += `PLANT_${index + 1}_VEG_END=${plant.growthPhases.vegEndDate || ''}\n`;
                            config += `PLANT_${index + 1}_FLOWER_START=${plant.growthPhases.flowerStartDate || ''}\n`;
                            config += `PLANT_${index + 1}_FLOWER_END=${plant.growthPhases.flowerEndDate || ''}\n`;
                            config += `PLANT_${index + 1}_DRY_START=${plant.growthPhases.dryStartDate || ''}\n`;
                            config += `PLANT_${index + 1}_DRY_END=${plant.growthPhases.dryEndDate || ''}\n`;
                        } else {
                            config += `PLANT_${index + 1}_VEG_DURATION=${plant.growthPhases.vegetation || 28}\n`;
                            config += `PLANT_${index + 1}_FLOWER_DURATION=${plant.growthPhases.flowering || 63}\n`;
                            config += `PLANT_${index + 1}_DRY_DURATION=${plant.growthPhases.drying || 10}\n`;
                        }
                    }
                    
                    config += '\n';
                });

                // Fertilizers Section
                config += '# =============================================================================\n';
                config += '#                               УДОБРЕНИЯ\n';
                config += '# =============================================================================\n\n';

                fertilizers.forEach((fertilizer, index) => {
                    config += `# --- УДОБРЕНИЕ ${index + 1}: ${fertilizer.name.toUpperCase()} ---\n`;
                    config += `FERTILIZER_${index + 1}_ID=${fertilizer.id}\n`;
                    config += `FERTILIZER_${index + 1}_NAME=${fertilizer.name}\n`;
                    config += `FERTILIZER_${index + 1}_NPK_N=${fertilizer.npk.n}\n`;
                    config += `FERTILIZER_${index + 1}_NPK_P=${fertilizer.npk.p}\n`;
                    config += `FERTILIZER_${index + 1}_NPK_K=${fertilizer.npk.k}\n`;
                    config += `FERTILIZER_${index + 1}_DENSITY=${fertilizer.density}\n`;
                    config += `FERTILIZER_${index + 1}_MICRO=${fertilizer.microElements || ''}\n`;
                    config += `FERTILIZER_${index + 1}_HAS_IMAGE=${fertilizer.image ? 'true' : 'false'}\n\n`;
                });

                // Recipes Section
                config += '# =============================================================================\n';
                config += '#                               РЕЦЕПТЫ\n';
                config += '# =============================================================================\n\n';

                recipes.forEach((recipe, index) => {
                    const npkTotals = this.calculateRecipeNPK(recipe);
                    
                    config += `# --- РЕЦЕПТ ${index + 1}: ${recipe.name.toUpperCase()} ---\n`;
                    config += `RECIPE_${index + 1}_ID=${recipe.id}\n`;
                    config += `RECIPE_${index + 1}_NAME=${recipe.name}\n`;
                    config += `RECIPE_${index + 1}_VOLUME=${recipe.volume}\n`;
                    config += `RECIPE_${index + 1}_FERTILIZERS_COUNT=${recipe.fertilizers.length}\n`;
                    config += `RECIPE_${index + 1}_TOTAL_N=${npkTotals.n.toFixed(1)}\n`;
                    config += `RECIPE_${index + 1}_TOTAL_P=${npkTotals.p.toFixed(1)}\n`;
                    config += `RECIPE_${index + 1}_TOTAL_K=${npkTotals.k.toFixed(1)}\n`;
                    
                    // List fertilizers in recipe
                    recipe.fertilizers.forEach((fert, fertIndex) => {
                        const fertilizer = this.data.fertilizers[fert.fertilizerId];
                        if (fertilizer) {
                            config += `RECIPE_${index + 1}_FERT_${fertIndex + 1}=${fertilizer.name} (${fert.dose}мл/л)\n`;
                        }
                    });
                    config += '\n';
                });

                // Statistics Section
                config += '# =============================================================================\n';
                config += '#                              СТАТИСТИКА\n';
                config += '# =============================================================================\n\n';

                const totalWaterings = Object.keys(this.data.wateringHistory || {}).length;
                const totalVolume = Object.values(this.data.wateringHistory || {}).reduce((sum, w) => sum + w.volume, 0);
                const activePlants = plants.filter(plant => this.isPlantActive(plant)).length;
                const plantsNeedingWater = plants.filter(plant => this.needsWatering(plant.id)).length;

                config += `TOTAL_PLANTS=${plants.length}\n`;
                config += `ACTIVE_PLANTS=${activePlants}\n`;
                config += `PLANTS_NEEDING_WATER=${plantsNeedingWater}\n`;
                config += `TOTAL_WATERINGS=${totalWaterings}\n`;
                config += `TOTAL_WATER_USED=${totalVolume.toFixed(1)}L\n`;
                config += `AVERAGE_WATERING=${totalWaterings > 0 ? (totalVolume / totalWaterings).toFixed(1) : '0'}L\n`;
                config += `DATA_SIZE_KB=${Math.round(JSON.stringify(this.data).length / 1024)}\n\n`;

                // Recent Activity
                const recentWaterings = Object.values(this.data.wateringHistory || {})
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5);

                if (recentWaterings.length > 0) {
                    config += '# --- ПОСЛЕДНИЕ ПОЛИВЫ ---\n';
                    recentWaterings.forEach((watering, index) => {
                        const date = new Date(watering.date).toLocaleDateString('ru-RU');
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const plantsNames = watering.plantIds.map(id => this.data.plants[id]?.name || 'Удаленное растение').join(', ');
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        
                        config += `RECENT_${index + 1}=${date} ${time} | ${plantsNames} | ${watering.volume}л`;
                        if (recipe) {
                            config += ` + ${recipe.name}`;
                        }
                        if (watering.notes) {
                            config += ` | ${watering.notes}`;
                        }
                        config += '\n';
                    });
                    config += '\n';
                }

                // Full JSON backup at the end
                config += '# =============================================================================\n';
                config += '#                          ПОЛНЫЙ JSON БЭКАП\n';
                config += '#                     (Для восстановления данных)\n';
                config += '# =============================================================================\n\n';
                config += '# JSON_DATA_START\n';
                config += JSON.stringify(this.data, null, 2);
                config += '\n# JSON_DATA_END\n';

                return config;
            }

            async backupToFolder() {
                if (!('showDirectoryPicker' in window)) {
                    alert('❌ Ваш браузер не поддерживает сохранение в папки.\n\nИспользуйте Chrome/Edge 86+ или другой современный браузер.\n\nВы можете использовать обычный экспорт файла.');
                    return;
                }

                try {
                    let directoryHandle = this.backupFolderHandle;
                    
                    // If no folder selected, ask user to select one
                    if (!directoryHandle) {
                        directoryHandle = await window.showDirectoryPicker({
                            mode: 'readwrite'
                        });
                        this.backupFolderHandle = directoryHandle;
                        this.data.settings.backup.folderName = directoryHandle.name;
                    }

                    // Generate filename with timestamp
                    const now = new Date();
                    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const filename = `plant-care-backup-${timestamp}.json`;

                    // Create file in the selected folder
                    const fileHandle = await directoryHandle.getFileHandle(filename, {
                        create: true
                    });

                    // Write data to file
                    const writable = await fileHandle.createWritable();
                    const dataStr = JSON.stringify(this.data, null, 2);
                    await writable.write(dataStr);
                    await writable.close();

                    // Update last backup time
                    this.data.settings.backup.lastBackupTime = now.toISOString();
                    this.saveData();

                    // Clean up old backups if enabled
                    await this.cleanupOldBackups(directoryHandle);

                    this.showNotification(`✅ Бэкап создан: ${filename}`, 'success');

                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error creating backup:', error);
                        this.showNotification('❌ Ошибка создания бэкапа', 'error');
                    }
                }
            }

            async cleanupOldBackups(directoryHandle) {
                try {
                    const keepFiles = this.data.settings.backup.keepFiles || 10;
                    const backupFiles = [];

                    // Collect all backup files
                    for await (const [name, handle] of directoryHandle.entries()) {
                        if (handle.kind === 'file' && name.startsWith('plant-care-backup-') && name.endsWith('.json')) {
                            const file = await handle.getFile();
                            backupFiles.push({
                                name: name,
                                handle: handle,
                                lastModified: file.lastModified
                            });
                        }
                    }

                    // Sort by date (newest first) and remove excess files
                    backupFiles.sort((a, b) => b.lastModified - a.lastModified);
                    
                    if (backupFiles.length > keepFiles) {
                        const filesToDelete = backupFiles.slice(keepFiles);
                        
                        for (const fileToDelete of filesToDelete) {
                            await directoryHandle.removeEntry(fileToDelete.name);
                        }
                        
                        console.log(`Cleaned up ${filesToDelete.length} old backup files`);
                    }
                } catch (error) {
                    console.error('Error cleaning up backups:', error);
                    // Don't show error to user as this is not critical
                }
            }

            async restoreFromConfigFile() {
                try {
                    this.showNotification('⏳ Загрузка config.txt с сервера...', 'info');

                    // Try to load config.txt from server first
                    const response = await fetch('/api/get-config', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    });

                    let content = '';
                    let source = 'сервера';
                    let lastModified = new Date();

                    if (response.ok) {
                        const result = await response.json();
                        content = result.content;
                        lastModified = new Date(result.timestamp || result.lastModified);
                    } else {
                        // Fallback to localStorage
                        content = localStorage.getItem('plant-care-config-backup');
                        const backupTime = localStorage.getItem('plant-care-config-backup-time');
                        
                        if (!content) {
                            throw new Error('Config.txt не найден ни на сервере, ни в локальном хранилище');
                        }
                        
                        source = 'локального хранилища';
                        lastModified = backupTime ? new Date(backupTime) : new Date();
                    }

                    // Extract JSON data from config file
                    const jsonStartMarker = '# JSON_DATA_START';
                    const jsonEndMarker = '# JSON_DATA_END';
                    
                    const startIndex = content.indexOf(jsonStartMarker);
                    const endIndex = content.indexOf(jsonEndMarker);
                    
                    if (startIndex === -1 || endIndex === -1) {
                        throw new Error('Config.txt не содержит данных для восстановления');
                    }

                    // Extract JSON content
                    const jsonContent = content.substring(startIndex + jsonStartMarker.length, endIndex).trim();
                    const importedData = JSON.parse(jsonContent);

                    // Validate data structure
                    if (!importedData.plants || !importedData.settings) {
                        throw new Error('Неверный формат данных в config.txt');
                    }

                    const plantsCount = Object.keys(importedData.plants).length;
                    const wateringsCount = Object.keys(importedData.wateringHistory || {}).length;
                    const configSize = Math.round(content.length / 1024);
                    
                    const confirmMessage = `Восстановить данные из config.txt?\n\n` +
                        `📁 Источник: ${source}\n` +
                        `📅 Размер: ${configSize}КБ\n` +
                        `📅 Последнее изменение: ${lastModified.toLocaleString('ru-RU')}\n\n` +
                        `📊 Содержимое:\n` +
                        `• Растений: ${plantsCount}\n` +
                        `• Записей поливов: ${wateringsCount}\n` +
                        `• Удобрений: ${Object.keys(importedData.fertilizers || {}).length}\n` +
                        `• Рецептов: ${Object.keys(importedData.recipes || {}).length}\n\n` +
                        `⚠️ Текущие данные будут заменены!`;

                    if (confirm(confirmMessage)) {
                        // Preserve current settings if not in import
                        if (this.data.settings.appTitle && !importedData.settings.appTitle) {
                            importedData.settings.appTitle = this.data.settings.appTitle;
                        }
                        if (this.data.settings.homeAssistant && !importedData.settings.homeAssistant) {
                            importedData.settings.homeAssistant = this.data.settings.homeAssistant;
                        }
                        if (this.data.settings.backup && !importedData.settings.backup) {
                            importedData.settings.backup = this.data.settings.backup;
                        }

                        this.data = importedData;
                        this.data.settings.currentDate = new Date(this.data.settings.currentDate || new Date());
                        this.saveData();

                        // Reinitialize
                        this.initializePlantPhases();
                        this.renderUI();

                        this.showNotification(`✅ Данные восстановлены из ${source}`, 'success');
                    }

                } catch (error) {
                    console.error('Error restoring from config:', error);
                    this.showNotification(`❌ Ошибка восстановления: ${error.message}`, 'error');
                    
                    // Offer file picker as last resort
                    if (confirm('Не удалось загрузить config.txt с сервера.\n\nХотите выбрать файл config.txt с компьютера?')) {
                        this.restoreFromLocalConfigFile();
                    }
                }
            }

            async restoreFromLocalConfigFile() {
                if (!('showOpenFilePicker' in window)) {
                    alert('❌ Ваш браузер не поддерживает выбор файлов.\n\nИспользуйте Chrome/Edge 86+ или другой современный браузер.');
                    return;
                }

                try {
                    // Ask user to select config.txt file
                    const [fileHandle] = await window.showOpenFilePicker({
                        types: [{
                            description: 'Конфигурационные файлы',
                            accept: {
                                'text/plain': ['.txt', '.config']
                            }
                        }],
                        multiple: false
                    });

                    const file = await fileHandle.getFile();
                    const content = await file.text();

                    // Extract JSON data from config file
                    const jsonStartMarker = '# JSON_DATA_START';
                    const jsonEndMarker = '# JSON_DATA_END';
                    
                    const startIndex = content.indexOf(jsonStartMarker);
                    const endIndex = content.indexOf(jsonEndMarker);
                    
                    if (startIndex === -1 || endIndex === -1) {
                        throw new Error('Файл config.txt не содержит данных для восстановления');
                    }

                    // Extract JSON content
                    const jsonContent = content.substring(startIndex + jsonStartMarker.length, endIndex).trim();
                    const importedData = JSON.parse(jsonContent);

                    // Validate data structure
                    if (!importedData.plants || !importedData.settings) {
                        throw new Error('Неверный формат данных в config.txt');
                    }

                    const plantsCount = Object.keys(importedData.plants).length;
                    const wateringsCount = Object.keys(importedData.wateringHistory || {}).length;
                    
                    const confirmMessage = `Восстановить данные из локального файла?\n\n` +
                        `📁 Файл: ${file.name}\n` +
                        `📅 Размер: ${Math.round(file.size / 1024)}КБ\n` +
                        `📅 Изменен: ${new Date(file.lastModified).toLocaleString('ru-RU')}\n\n` +
                        `📊 Содержимое:\n` +
                        `• Растений: ${plantsCount}\n` +
                        `• Записей поливов: ${wateringsCount}\n` +
                        `• Удобрений: ${Object.keys(importedData.fertilizers || {}).length}\n` +
                        `• Рецептов: ${Object.keys(importedData.recipes || {}).length}\n\n` +
                        `⚠️ Текущие данные будут заменены!`;

                    if (confirm(confirmMessage)) {
                        this.data = importedData;
                        this.data.settings.currentDate = new Date(this.data.settings.currentDate || new Date());
                        this.saveData();

                        // Reinitialize
                        this.initializePlantPhases();
                        this.renderUI();

                        this.showNotification('✅ Данные восстановлены из локального файла', 'success');
                    }

                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error restoring from local config:', error);
                        this.showNotification(`❌ Ошибка восстановления: ${error.message}`, 'error');
                    }
                }
            }

            async restoreFromFolder() {
                if (!('showDirectoryPicker' in window)) {
                    alert('❌ Ваш браузер не поддерживает выбор папок.\n\nИспользуйте Chrome/Edge 86+ или другой современный браузер.\n\nВы можете использовать обычный импорт файла.');
                    return;
                }

                try {
                    let directoryHandle = this.backupFolderHandle;
                    
                    // If no folder selected, ask user to select one
                    if (!directoryHandle) {
                        directoryHandle = await window.showDirectoryPicker({
                            mode: 'read'
                        });
                    }

                    // Collect all backup files
                    const backupFiles = [];
                    for await (const [name, handle] of directoryHandle.entries()) {
                        if (handle.kind === 'file' && name.startsWith('plant-care-backup-') && name.endsWith('.json')) {
                            const file = await handle.getFile();
                            backupFiles.push({
                                name: name,
                                handle: handle,
                                lastModified: file.lastModified,
                                size: file.size
                            });
                        }
                    }

                    if (backupFiles.length === 0) {
                        this.showNotification('❌ В выбранной папке нет файлов бэкапа', 'error');
                        return;
                    }

                    // Sort by date (newest first)
                    backupFiles.sort((a, b) => b.lastModified - a.lastModified);

                    // Create selection dialog
                    const fileOptions = backupFiles.map((file, index) => {
                        const date = new Date(file.lastModified).toLocaleString('ru-RU');
                        const size = Math.round(file.size / 1024);
                        return `${index}: ${file.name} (${date}, ${size}КБ)`;
                    }).join('\n');

                    const selection = prompt(
                        `Выберите файл бэкапа для восстановления:\n\n${fileOptions}\n\nВведите номер файла (0-${backupFiles.length-1}):`
                    );

                    if (selection === null) return; // User cancelled

                    const selectedIndex = parseInt(selection);
                    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= backupFiles.length) {
                        this.showNotification('❌ Неверный номер файла', 'error');
                        return;
                    }

                    // Read selected backup file
                    const selectedFile = backupFiles[selectedIndex];
                    const file = await selectedFile.handle.getFile();
                    const content = await file.text();
                    const importedData = JSON.parse(content);

                    // Validate and confirm import (reuse existing validation)
                    if (!importedData.plants || !importedData.settings) {
                        throw new Error('Неверный формат файла');
                    }

                    const plantsCount = Object.keys(importedData.plants).length;
                    const wateringsCount = Object.keys(importedData.wateringHistory || {}).length;
                    
                    const confirmMessage = `Восстановить данные из бэкапа?\n\n` +
                        `📁 Файл: ${selectedFile.name}\n` +
                        `📅 Дата: ${new Date(selectedFile.lastModified).toLocaleString('ru-RU')}\n\n` +
                        `📊 Содержимое:\n` +
                        `• Растений: ${plantsCount}\n` +
                        `• Записей поливов: ${wateringsCount}\n` +
                        `• Удобрений: ${Object.keys(importedData.fertilizers || {}).length}\n` +
                        `• Рецептов: ${Object.keys(importedData.recipes || {}).length}\n\n` +
                        `⚠️ Текущие данные будут заменены!`;

                    if (confirm(confirmMessage)) {
                        // Preserve current settings if not in import
                        if (this.data.settings.appTitle && !importedData.settings.appTitle) {
                            importedData.settings.appTitle = this.data.settings.appTitle;
                        }
                        if (this.data.settings.homeAssistant && !importedData.settings.homeAssistant) {
                            importedData.settings.homeAssistant = this.data.settings.homeAssistant;
                        }
                        if (this.data.settings.backup && !importedData.settings.backup) {
                            importedData.settings.backup = this.data.settings.backup;
                        }

                        this.data = importedData;
                        this.data.settings.currentDate = new Date(this.data.settings.currentDate || new Date());
                        this.saveData();

                        // Reinitialize
                        this.initializePlantPhases();
                        this.renderUI();

                        this.showNotification('✅ Данные успешно восстановлены из бэкапа', 'success');
                    }

                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error restoring backup:', error);
                        this.showNotification(`❌ Ошибка восстановления: ${error.message}`, 'error');
                    }
                }
            }

            setupAutoBackup() {
                // Clear existing timer
                if (this.autoBackupTimer) {
                    clearInterval(this.autoBackupTimer);
                }

                const backupSettings = this.data.settings.backup;
                if (!backupSettings.autoEnabled || !this.backupFolderHandle) {
                    return;
                }

                // Calculate interval in milliseconds
                let interval;
                switch (backupSettings.frequency) {
                    case 'daily':
                        interval = 24 * 60 * 60 * 1000; // 24 hours
                        break;
                    case 'weekly':
                        interval = 7 * 24 * 60 * 60 * 1000; // 7 days
                        break;
                    case 'monthly':
                        interval = 30 * 24 * 60 * 60 * 1000; // 30 days
                        break;
                    default:
                        interval = 7 * 24 * 60 * 60 * 1000; // Default to weekly
                }

                // Check if backup is needed now
                const lastBackup = backupSettings.lastBackupTime ? new Date(backupSettings.lastBackupTime) : new Date(0);
                const now = new Date();
                
                if (now - lastBackup >= interval) {
                    // Perform immediate backup
                    setTimeout(() => this.performAutoBackup(), 5000); // Wait 5 seconds after app start
                }

                // Set up recurring backup
                this.autoBackupTimer = setInterval(() => {
                    this.performAutoBackup();
                }, interval);
            }

            async performAutoBackup() {
                try {
                    if (!this.backupFolderHandle) {
                        console.log('No backup folder configured for auto backup');
                        return;
                    }

                    // Generate filename with timestamp
                    const now = new Date();
                    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
                    const filename = `plant-care-auto-backup-${timestamp}.json`;

                    // Create file in the selected folder
                    const fileHandle = await this.backupFolderHandle.getFileHandle(filename, {
                        create: true
                    });

                    // Write data to file
                    const writable = await fileHandle.createWritable();
                    const dataStr = JSON.stringify(this.data, null, 2);
                    await writable.write(dataStr);
                    await writable.close();

                    // Update last backup time
                    this.data.settings.backup.lastBackupTime = now.toISOString();
                    this.saveData();

                    // Clean up old backups
                    await this.cleanupOldBackups(this.backupFolderHandle);

                    console.log(`Auto backup created: ${filename}`);

                } catch (error) {
                    console.error('Error performing auto backup:', error);
                }
            }

            updateSettingsStats() {
                const plantsCount = Object.keys(this.data.plants).length;
                const wateringsCount = Object.keys(this.data.wateringHistory).length;
                const dataSize = Math.round(JSON.stringify(this.data).length / 1024);
                const storageStatus = this.storage.getStatus();
                const lastSavedAt = storageStatus.lastSavedAt
                    ? new Date(storageStatus.lastSavedAt).toLocaleString('ru-RU')
                    : 'еще не сохранялось';
                
                document.getElementById('stats-plants-count').textContent = plantsCount;
                document.getElementById('stats-waterings-count').textContent = wateringsCount;
                document.getElementById('stats-data-size').textContent = `${dataSize} КБ`;
                document.getElementById('stats-storage-engine').textContent = storageStatus.engine;
                document.getElementById('stats-last-save').textContent = lastSavedAt;
            }

            showNotification(message, type = 'info') {
                // Create notification element
                const notification = document.createElement('div');
                notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full ${
                    type === 'success' ? 'bg-green-600' : 
                    type === 'error' ? 'bg-red-600' : 
                    type === 'warning' ? 'bg-yellow-600' : 
                    'bg-blue-600'
                } text-white font-medium`;
                notification.textContent = message;
                
                document.body.appendChild(notification);
                
                // Animate in
                setTimeout(() => {
                    notification.classList.remove('translate-x-full');
                }, 100);
                
                // Animate out and remove
                setTimeout(() => {
                    notification.classList.add('translate-x-full');
                    setTimeout(() => notification.remove(), 300);
                }, 3000);
            }

            async testHomeAssistantConnection() {
                const statusDiv = document.getElementById('ha-connection-status');
                const url = document.getElementById('settings-ha-url').value.trim();
                const token = document.getElementById('settings-ha-token').value.trim();
                
                if (!url || !token) {
                    this.showConnectionStatus('error', 'Заполните URL и токен доступа');
                    return;
                }
                
                this.showConnectionStatus('loading', 'Проверка соединения...');
                
                try {
                    const response = await fetch(`${url}/api/`, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        this.showConnectionStatus('success', `✅ Соединение установлено с Home Assistant ${data.version || 'Unknown'}`);
                    } else {
                        this.showConnectionStatus('error', `❌ Ошибка подключения: ${response.status} ${response.statusText}`);
                    }
                } catch (error) {
                    this.showConnectionStatus('error', `❌ Ошибка сети: ${error.message}`);
                }
            }

            showConnectionStatus(type, message) {
                const statusDiv = document.getElementById('ha-connection-status');
                statusDiv.className = `p-3 rounded-lg text-sm ${
                    type === 'success' ? 'bg-green-600/20 border border-green-600/30 text-green-400' :
                    type === 'error' ? 'bg-red-600/20 border border-red-600/30 text-red-400' :
                    'bg-blue-600/20 border border-blue-600/30 text-blue-400'
                }`;
                statusDiv.textContent = message;
                statusDiv.classList.remove('hidden');
                
                if (type !== 'loading') {
                    setTimeout(() => statusDiv.classList.add('hidden'), 5000);
                }
            }

            async syncHomeAssistantEntities() {
                const haSettings = this.data.settings.homeAssistant;
                
                if (!haSettings.enabled || !haSettings.url || !haSettings.accessToken) {
                    this.showNotification('⚠️ Настройте Home Assistant перед синхронизацией', 'warning');
                    return;
                }
                
                this.showConnectionStatus('loading', 'Синхронизация сущностей...');
                
                try {
                    const plants = Object.values(this.data.plants);
                    const prefix = haSettings.entityPrefix;
                    let createdCount = 0;
                    
                    // Create sensor for each plant
                    for (const plant of plants) {
                        const plantSlug = plant.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                        const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                        
                        // Create phase sensor
                        await this.createHomeAssistantSensor(
                            `${prefix}_${plantSlug}_phase`,
                            currentPhase ? this.getPhaseDisplayName(currentPhase.type) : 'Неизвестно',
                            {
                                'friendly_name': `${plant.name} - Фаза роста`,
                                'device_class': 'enum',
                                'icon': 'mdi:sprout'
                            }
                        );
                        
                        // Create day sensor
                        await this.createHomeAssistantSensor(
                            `${prefix}_${plantSlug}_day`,
                            daysSince,
                            {
                                'friendly_name': `${plant.name} - День с посадки`,
                                'unit_of_measurement': 'дней',
                                'icon': 'mdi:calendar'
                            }
                        );
                        
                        createdCount += 2;
                    }
                    
                    // Create total plants sensor
                    await this.createHomeAssistantSensor(
                        `${prefix}_total_plants`,
                        plants.length,
                        {
                            'friendly_name': 'Всего растений',
                            'unit_of_measurement': 'шт',
                            'icon': 'mdi:sprout-outline'
                        }
                    );
                    
                    createdCount++;
                    
                    this.showConnectionStatus('success', `✅ Синхронизировано ${createdCount} сущностей с Home Assistant`);
                } catch (error) {
                    this.showConnectionStatus('error', `❌ Ошибка синхронизации: ${error.message}`);
                }
            }

            async createHomeAssistantSensor(entityId, state, attributes = {}) {
                const haSettings = this.data.settings.homeAssistant;
                
                try {
                    const response = await fetch(`${haSettings.url}/api/states/sensor.${entityId}`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${haSettings.accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            state: state,
                            attributes: attributes
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }
                } catch (error) {
                    console.error(`Failed to create sensor ${entityId}:`, error);
                    throw error;
                }
            }

            // Telegram Integration Methods
            async sendTelegramMessage(message) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
                    console.log('Telegram not configured, skipping message');
                    return false;
                }

                try {
                    const response = await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendMessage`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            chat_id: telegramSettings.chatId,
                            text: message,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.description || `HTTP ${response.status}`);
                    }

                    return true;
                } catch (error) {
                    console.error('Failed to send Telegram message:', error);
                    return false;
                }
            }

            async sendTelegramDocument(backupData, timestamp, plantsCount, wateringsCount, backupSize) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
                    console.log('Telegram not configured, skipping document');
                    return false;
                }

                try {
                    console.log('Sending backup document to Telegram...');
                    console.log('Bot token:', telegramSettings.botToken ? 'configured' : 'missing');
                    console.log('Chat ID:', telegramSettings.chatId);
                    
                    // Create form data for file upload
                    const formData = new FormData();
                    const blob = new Blob([backupData], { type: 'application/json' });
                    const filename = `plant_care_backup_${new Date().toISOString().slice(0, 10)}.json`;
                    
                    formData.append('chat_id', telegramSettings.chatId);
                    formData.append('document', blob, filename);
                    
                    const caption = `🗄️ <b>Бэкап Plant Care Pro</b>\n\n` +
                        `📅 Дата: ${timestamp}\n` +
                        `🌱 Растений: ${plantsCount}\n` +
                        `💧 Записей поливов: ${wateringsCount}\n` +
                        `📊 Размер: ${backupSize} КБ`;
                        
                    formData.append('caption', caption);
                    formData.append('parse_mode', 'HTML');

                    console.log('Making request to Telegram API...');
                    const response = await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendDocument`, {
                        method: 'POST',
                        body: formData
                    });

                    console.log('Response status:', response.status);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Telegram API error response:', errorText);
                        
                        let errorData;
                        try {
                            errorData = JSON.parse(errorText);
                        } catch (e) {
                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                        }
                        
                        throw new Error(errorData.description || `HTTP ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('Telegram response:', result);
                    return true;
                } catch (error) {
                    console.error('Failed to send Telegram document:', error);
                    throw error; // Re-throw to show specific error
                }
            }

            async testTelegramConnection() {
                const statusDiv = document.getElementById('telegram-connection-status');
                const token = document.getElementById('settings-telegram-token').value.trim();
                const chatId = document.getElementById('settings-telegram-chat-id').value.trim();
                
                if (!token || !chatId) {
                    this.showTelegramStatus('error', '⚠️ Заполните токен бота и Chat ID');
                    return;
                }
                
                this.showTelegramStatus('loading', '⏳ Отправка тестового сообщения...');
                
                try {
                    const testMessage = `🧪 <b>Тестовое сообщение</b>\n\n` +
                        `✅ Telegram бот успешно подключен к Plant Care Pro!\n` +
                        `📅 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                        `🌿 Приложение готово к отправке уведомлений о ваших растениях.`;

                    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: testMessage,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        })
                    });

                    if (response.ok) {
                        this.showTelegramStatus('success', '✅ Тестовое сообщение успешно отправлено!');
                    } else {
                        const error = await response.json();
                        this.showTelegramStatus('error', `❌ Ошибка: ${error.description || 'Неизвестная ошибка'}`);
                    }
                } catch (error) {
                    this.showTelegramStatus('error', `❌ Ошибка сети: ${error.message}`);
                }
            }

            async getTelegramChatId() {
                const token = document.getElementById('settings-telegram-token').value.trim();
                
                if (!token) {
                    this.showTelegramStatus('error', '⚠️ Сначала введите токен бота');
                    return;
                }
                
                this.showTelegramStatus('loading', '⏳ Получение обновлений от бота...');
                
                try {
                    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1`);
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.description || 'Неверный токен');
                    }
                    
                    const data = await response.json();
                    
                    if (data.result && data.result.length > 0) {
                        const chatId = data.result[0].message?.chat?.id || data.result[0].message?.from?.id;
                        
                        if (chatId) {
                            document.getElementById('settings-telegram-chat-id').value = chatId;
                            this.showTelegramStatus('success', `✅ Chat ID получен: ${chatId}\n\nТеперь нажмите "Тестовое сообщение" для проверки`);
                        } else {
                            this.showTelegramStatus('error', '❌ Не удалось найти Chat ID.\n\nОтправьте команду /start боту и попробуйте снова.');
                        }
                    } else {
                        this.showTelegramStatus('error', '❌ Нет сообщений от бота.\n\nОтправьте команду /start своему боту в Telegram и попробуйте снова.');
                    }
                } catch (error) {
                    this.showTelegramStatus('error', `❌ Ошибка: ${error.message}`);
                }
            }

            async sendPlantStatusToTelegram() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
                    this.showTelegramStatus('error', '⚠️ Настройте Telegram интеграцию');
                    return;
                }

                this.showTelegramStatus('loading', '📤 Отправка статуса растений...');

                const plants = Object.values(this.data.plants);
                
                if (plants.length === 0) {
                    this.showTelegramStatus('error', '❌ Нет растений для отправки');
                    return;
                }

                let message = `🌿 <b>Статус растений</b>\n`;
                message += `📅 ${new Date().toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                })}\n\n`;

                let activePlantsCount = 0;
                let plantsNeedingWater = 0;

                plants.forEach((plant, index) => {
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                    const needsWatering = this.needsWatering(plant.id);
                    const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                    const isActive = this.isPlantActive(plant);

                    if (isActive) activePlantsCount++;
                    if (needsWatering) plantsNeedingWater++;

                    const phaseIcon = this.getPhaseIcon(currentPhase?.type || 'unknown');
                    const statusIcon = needsWatering ? '💧' : isActive ? '🟢' : '🔴';

                    message += `${statusIcon} <b>${plant.name}</b>\n`;
                    if (plant.strain) message += `   🧬 ${plant.strain}\n`;
                    message += `   📅 День ${daysSince} с посадки\n`;
                    message += `   ${phaseIcon} ${this.getPhaseDisplayName(currentPhase?.type || 'unknown')}\n`;
                    
                    if (needsWatering) {
                        message += `   ⚠️ <b>Требуется полив!</b> (${daysSinceWatering} дн. назад)\n`;
                    } else if (daysSinceWatering <= 1) {
                        message += `   ✅ Недавно полито (${daysSinceWatering} дн. назад)\n`;
                    } else {
                        message += `   💧 Последний полив: ${daysSinceWatering} дн. назад\n`;
                    }
                    
                    message += '\n';
                });

                // Summary
                message += `📊 <b>Сводка:</b>\n`;
                message += `• Всего растений: ${plants.length}\n`;
                message += `• Активных: ${activePlantsCount}\n`;
                message += `• Требуют полива: ${plantsNeedingWater}\n`;

                if (plantsNeedingWater > 0) {
                    message += `\n⚠️ <b>Внимание!</b> ${plantsNeedingWater} растени${plantsNeedingWater === 1 ? 'е требует' : plantsNeedingWater < 5 ? 'я требуют' : 'й требуют'} полива!`;
                }

                const success = await this.sendTelegramMessage(message);
                
                if (success) {
                    this.showTelegramStatus('success', '✅ Статус растений отправлен в Telegram');
                } else {
                    this.showTelegramStatus('error', '❌ Не удалось отправить сообщение');
                }
            }

            showTelegramStatus(type, message) {
                const statusDiv = document.getElementById('telegram-connection-status');
                statusDiv.className = `p-3 rounded-lg text-sm whitespace-pre-line ${
                    type === 'success' ? 'bg-green-600/20 border border-green-600/30 text-green-400' :
                    type === 'error' ? 'bg-red-600/20 border border-red-600/30 text-red-400' :
                    'bg-blue-600/20 border border-blue-600/30 text-blue-400'
                }`;
                statusDiv.textContent = message;
                statusDiv.classList.remove('hidden');
                
                if (type !== 'loading') {
                    setTimeout(() => statusDiv.classList.add('hidden'), 8000);
                }
            }

            // Notification triggers
            async notifyWateringNeeded(plantIds) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.wateringReminders) {
                    return;
                }

                const plants = plantIds.map(id => this.data.plants[id]).filter(plant => plant);
                
                if (plants.length === 0) return;

                let message = `💧 <b>Напоминание о поливе</b>\n\n`;
                
                plants.forEach(plant => {
                    const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    
                    message += `🌿 <b>${plant.name}</b>\n`;
                    message += `   ${this.getPhaseIcon(currentPhase?.type || 'unknown')} ${this.getPhaseShortName(currentPhase?.type || 'unknown')}\n`;
                    message += `   ⏰ ${daysSinceWatering} дн. без полива\n\n`;
                });

                message += `🎯 <i>Откройте Plant Care Pro для быстрого полива</i>`;

                await this.sendTelegramMessage(message);
            }

            async notifyPhaseChange(plantId, newPhase) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.phaseChanges) {
                    return;
                }

                const plant = this.data.plants[plantId];
                if (!plant) return;

                const phaseIcon = this.getPhaseIcon(newPhase.type);
                const phaseName = this.getPhaseDisplayName(newPhase.type);

                let message = `🔄 <b>Смена фазы роста</b>\n\n`;
                message += `🌿 <b>${plant.name}</b>\n`;
                message += `${phaseIcon} Переход в фазу: <b>${phaseName}</b>\n`;
                message += `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n`;

                // Recommendations based on phase
                if (newPhase.type === 'flowering') {
                    message += `\n💡 <b>Рекомендации:</b>\n`;
                    message += `• Переключите световой режим на 12/12\n`;
                    message += `• Используйте удобрения для цветения\n`;
                    message += `• Следите за влажностью`;
                } else if (newPhase.type === 'drying') {
                    message += `\n💡 <b>Рекомендации:</b>\n`;
                    message += `• Прекратите полив\n`;
                    message += `• Выключите освещение\n`;
                    message += `• Поддерживайте температуру 18-22°C`;
                }

                await this.sendTelegramMessage(message);
            }

            async sendDailySummary() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.dailySummary) {
                    return;
                }

                // Check if summary was already sent today
                const today = new Date().toDateString();
                const lastSummary = telegramSettings.lastDailySummary;
                
                if (lastSummary && new Date(lastSummary).toDateString() === today) {
                    return; // Already sent today
                }

                const plants = Object.values(this.data.plants);
                
                if (plants.length === 0) return;

                let message = `🌅 <b>Ежедневная сводка</b>\n`;
                message += `📅 ${new Date().toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long' 
                })}\n\n`;

                let activePlants = 0;
                let plantsNeedingWater = 0;
                let plantsWateredToday = 0;

                // Check today's waterings
                const todayStr = this.getLocalDateString(new Date());
                const todayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = this.getLocalDateString(new Date(watering.date));
                    return wateringDate === todayStr;
                });

                const wateredPlantIds = new Set();
                todayWaterings.forEach(watering => {
                    watering.plantIds.forEach(id => wateredPlantIds.add(id));
                });

                plantsWateredToday = wateredPlantIds.size;

                plants.forEach(plant => {
                    const isActive = this.isPlantActive(plant);
                    const needsWatering = this.needsWatering(plant.id);
                    
                    if (isActive) activePlants++;
                    if (needsWatering) plantsNeedingWater++;
                });

                message += `📊 <b>Статистика:</b>\n`;
                message += `• Активных растений: ${activePlants}/${plants.length}\n`;
                message += `• Полито сегодня: ${plantsWateredToday}\n`;
                message += `• Требуют полива: ${plantsNeedingWater}\n`;

                if (plantsNeedingWater > 0) {
                    message += `\n⚠️ <b>Требуют внимания:</b>\n`;
                    plants.forEach(plant => {
                        if (this.needsWatering(plant.id)) {
                            const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                            message += `• ${plant.name} (${daysSinceWatering} дн.)\n`;
                        }
                    });
                }

                if (todayWaterings.length > 0) {
                    message += `\n✅ <b>Поливы сегодня:</b>\n`;
                    todayWaterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        message += `• ${time}: ${watering.volume}л${recipe ? ` + ${recipe.name}` : ''}\n`;
                    });
                }

                const success = await this.sendTelegramMessage(message);
                
                if (success) {
                    // Update last summary time
                    this.data.settings.telegram.lastDailySummary = new Date().toISOString();
                    this.saveData();
                }
            }

            // Setup daily summary timer
            setupTelegramNotifications() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.dailySummary) {
                    return;
                }

                // Clear existing timer
                if (this.telegramTimer) {
                    clearInterval(this.telegramTimer);
                }

                // Check every minute for daily summary time
                this.telegramTimer = setInterval(() => {
                    const now = new Date();
                    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
                    const summaryTime = telegramSettings.notifications.dailyTime || '09:00';
                    
                    if (currentTime === summaryTime) {
                        this.sendDailySummary();
                    }
                }, 60000); // Check every minute
            }

            // Telegram Integration Methods
            toggleTelegramSettings(enabled) {
                const content = document.getElementById('telegram-settings-content');
                if (enabled) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            }

            toggleDailySummaryTime(enabled) {
                const timeInput = document.getElementById('daily-summary-time');
                if (enabled) {
                    timeInput.classList.remove('hidden');
                } else {
                    timeInput.classList.add('hidden');
                }
            }

            toggleTelegramBackupSettings(enabled) {
                const settings = document.getElementById('telegram-backup-settings');
                if (enabled) {
                    settings.classList.remove('hidden');
                    this.setupTelegramBackupSchedule();
                } else {
                    settings.classList.add('hidden');
                    if (this.telegramBackupTimer) {
                        clearInterval(this.telegramBackupTimer);
                        this.telegramBackupTimer = null;
                    }
                }
            }

            setupTelegramBackupSchedule() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.autoBackup) {
                    return;
                }

                // Clear existing timer
                if (this.telegramBackupTimer) {
                    clearInterval(this.telegramBackupTimer);
                }

                // Check every minute for backup time
                this.telegramBackupTimer = setInterval(() => {
                    const now = new Date();
                    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
                    const backupTime = telegramSettings.backupTime || '20:00';
                    
                    if (currentTime === backupTime && this.shouldSendTelegramBackup()) {
                        this.sendBackupToTelegram();
                    }
                }, 60000); // Check every minute
            }

            shouldSendTelegramBackup() {
                const telegramSettings = this.data.settings.telegram;
                const frequency = telegramSettings.backupFrequency || 'weekly';
                const lastBackup = telegramSettings.lastBackupTime ? new Date(telegramSettings.lastBackupTime) : new Date(0);
                const now = new Date();
                
                let interval;
                switch (frequency) {
                    case 'daily':
                        interval = 24 * 60 * 60 * 1000; // 1 day
                        break;
                    case 'weekly':
                        interval = 7 * 24 * 60 * 60 * 1000; // 7 days
                        break;
                    case 'monthly':
                        interval = 30 * 24 * 60 * 60 * 1000; // 30 days
                        break;
                    default:
                        interval = 7 * 24 * 60 * 60 * 1000; // Default weekly
                }
                
                return (now - lastBackup) >= interval;
            }

            async sendBackupToTelegram() {
                try {
                    // Check if Telegram is configured
                    const telegramSettings = this.data.settings.telegram;
                    if (!telegramSettings?.enabled) {
                        throw new Error('Telegram интеграция не включена');
                    }
                    
                    if (!telegramSettings.botToken || !telegramSettings.chatId) {
                        throw new Error('Не настроены токен бота или Chat ID');
                    }

                    const timestamp = new Date().toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const plantsCount = this.data.plants ? this.data.plants.length : 0;
                    const wateringsCount = this.data.waterings ? this.data.waterings.length : 0;

                    // Create backup data
                    const backupData = JSON.stringify(this.data, null, 2);
                    const backupSize = (new Blob([backupData]).size / 1024).toFixed(1);

                    // Send backup as file instead of text message to avoid size limits
                    await this.sendTelegramDocument(backupData, timestamp, plantsCount, wateringsCount, backupSize);
                    
                    // Update last backup time
                    if (!this.data.settings.telegram) {
                        this.data.settings.telegram = {};
                    }
                    this.data.settings.telegram.lastBackupTime = new Date().toISOString();
                    this.saveData();
                    
                    // Update UI
                    const lastBackupElement = document.getElementById('last-telegram-backup-time');
                    if (lastBackupElement) {
                        lastBackupElement.textContent = timestamp;
                    }
                    
                    console.log('Backup sent to Telegram successfully');
                    this.showNotification('✅ Бэкап отправлен в Telegram', 'success');
                    
                } catch (error) {
                    console.error('Error sending backup to Telegram:', error);
                    this.showNotification(`❌ Ошибка отправки бэкапа в Telegram: ${error.message}`, 'error');
                }
            }

            async sendTelegramMessage(message) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
                    console.log('Telegram not configured, skipping message');
                    return false;
                }

                try {
                    const response = await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendMessage`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            chat_id: telegramSettings.chatId,
                            text: message,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        })
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.description || `HTTP ${response.status}`);
                    }

                    return true;
                } catch (error) {
                    console.error('Failed to send Telegram message:', error);
                    return false;
                }
            }

            async sendTelegramDocument(backupData, timestamp, plantsCount, wateringsCount, backupSize) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
                    console.log('Telegram not configured, skipping document');
                    return false;
                }

                try {
                    console.log('Sending backup document to Telegram...');
                    console.log('Bot token:', telegramSettings.botToken ? 'configured' : 'missing');
                    console.log('Chat ID:', telegramSettings.chatId);
                    
                    // Create form data for file upload
                    const formData = new FormData();
                    const blob = new Blob([backupData], { type: 'application/json' });
                    const filename = `plant_care_backup_${new Date().toISOString().slice(0, 10)}.json`;
                    
                    formData.append('chat_id', telegramSettings.chatId);
                    formData.append('document', blob, filename);
                    
                    const caption = `🗄️ <b>Бэкап Plant Care Pro</b>\n\n` +
                        `📅 Дата: ${timestamp}\n` +
                        `🌱 Растений: ${plantsCount}\n` +
                        `💧 Записей поливов: ${wateringsCount}\n` +
                        `📊 Размер: ${backupSize} КБ`;
                        
                    formData.append('caption', caption);
                    formData.append('parse_mode', 'HTML');

                    console.log('Making request to Telegram API...');
                    const response = await fetch(`https://api.telegram.org/bot${telegramSettings.botToken}/sendDocument`, {
                        method: 'POST',
                        body: formData
                    });

                    console.log('Response status:', response.status);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Telegram API error response:', errorText);
                        
                        let errorData;
                        try {
                            errorData = JSON.parse(errorText);
                        } catch (e) {
                            throw new Error(`HTTP ${response.status}: ${errorText}`);
                        }
                        
                        throw new Error(errorData.description || `HTTP ${response.status}`);
                    }

                    const result = await response.json();
                    console.log('Telegram response:', result);
                    return true;
                } catch (error) {
                    console.error('Failed to send Telegram document:', error);
                    throw error; // Re-throw to show specific error
                }
            }

            async testTelegramConnection() {
                const statusDiv = document.getElementById('telegram-connection-status');
                const token = document.getElementById('settings-telegram-token').value.trim();
                const chatId = document.getElementById('settings-telegram-chat-id').value.trim();
                
                if (!token || !chatId) {
                    this.showTelegramStatus('error', '⚠️ Заполните токен бота и Chat ID');
                    return;
                }
                
                this.showTelegramStatus('loading', '⏳ Отправка тестового сообщения...');
                
                try {
                    const testMessage = `🧪 <b>Тестовое сообщение</b>\n\n` +
                        `✅ Telegram бот успешно подключен к Plant Care Pro!\n` +
                        `📅 Время: ${new Date().toLocaleString('ru-RU')}\n` +
                        `🌿 Приложение готово к отправке уведомлений о ваших растениях.`;

                    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: testMessage,
                            parse_mode: 'HTML',
                            disable_web_page_preview: true
                        })
                    });

                    if (response.ok) {
                        this.showTelegramStatus('success', '✅ Тестовое сообщение успешно отправлено!');
                    } else {
                        const error = await response.json();
                        this.showTelegramStatus('error', `❌ Ошибка: ${error.description || 'Неизвестная ошибка'}`);
                    }
                } catch (error) {
                    this.showTelegramStatus('error', `❌ Ошибка сети: ${error.message}`);
                }
            }

            async getTelegramChatId() {
                const token = document.getElementById('settings-telegram-token').value.trim();
                
                if (!token) {
                    this.showTelegramStatus('error', '⚠️ Сначала введите токен бота');
                    return;
                }
                
                this.showTelegramStatus('loading', '⏳ Получение обновлений от бота...');
                
                try {
                    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=1&offset=-1`);
                    
                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(error.description || 'Неверный токен');
                    }
                    
                    const data = await response.json();
                    
                    if (data.result && data.result.length > 0) {
                        const chatId = data.result[0].message?.chat?.id || data.result[0].message?.from?.id;
                        
                        if (chatId) {
                            document.getElementById('settings-telegram-chat-id').value = chatId;
                            this.showTelegramStatus('success', `✅ Chat ID получен: ${chatId}\n\nТеперь нажмите "Тестовое сообщение" для проверки`);
                        } else {
                            this.showTelegramStatus('error', '❌ Не удалось найти Chat ID.\n\nОтправьте команду /start боту и попробуйте снова.');
                        }
                    } else {
                        this.showTelegramStatus('error', '❌ Нет сообщений от бота.\n\nОтправьте команду /start своему боту в Telegram и попробуйте снова.');
                    }
                } catch (error) {
                    this.showTelegramStatus('error', `❌ Ошибка: ${error.message}`);
                }
            }

            async sendPlantStatusToTelegram() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.botToken || !telegramSettings.chatId) {
                    this.showTelegramStatus('error', '⚠️ Настройте Telegram интеграцию');
                    return;
                }

                this.showTelegramStatus('loading', '📤 Отправка статуса растений...');

                const plants = Object.values(this.data.plants);
                
                if (plants.length === 0) {
                    this.showTelegramStatus('error', '❌ Нет растений для отправки');
                    return;
                }

                let message = `🌿 <b>Статус растений</b>\n`;
                message += `📅 ${new Date().toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long', 
                    year: 'numeric' 
                })}\n\n`;

                let activePlantsCount = 0;
                let plantsNeedingWater = 0;

                plants.forEach((plant, index) => {
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    const daysSince = this.getDaysSincePlanting(plant.id, new Date());
                    const needsWatering = this.needsWatering(plant.id);
                    const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                    const isActive = this.isPlantActive(plant);

                    if (isActive) activePlantsCount++;
                    if (needsWatering) plantsNeedingWater++;

                    const phaseIcon = this.getPhaseIcon(currentPhase?.type || 'unknown');
                    const statusIcon = needsWatering ? '💧' : isActive ? '🟢' : '🔴';

                    message += `${statusIcon} <b>${plant.name}</b>\n`;
                    if (plant.strain) message += `   🧬 ${plant.strain}\n`;
                    message += `   📅 День ${daysSince} с посадки\n`;
                    message += `   ${phaseIcon} ${this.getPhaseDisplayName(currentPhase?.type || 'unknown')}\n`;
                    
                    if (needsWatering) {
                        message += `   ⚠️ <b>Требуется полив!</b> (${daysSinceWatering} дн. назад)\n`;
                    } else if (daysSinceWatering <= 1) {
                        message += `   ✅ Недавно полито (${daysSinceWatering} дн. назад)\n`;
                    } else {
                        message += `   💧 Последний полив: ${daysSinceWatering} дн. назад\n`;
                    }
                    
                    message += '\n';
                });

                // Summary
                message += `📊 <b>Сводка:</b>\n`;
                message += `• Всего растений: ${plants.length}\n`;
                message += `• Активных: ${activePlantsCount}\n`;
                message += `• Требуют полива: ${plantsNeedingWater}\n`;

                if (plantsNeedingWater > 0) {
                    message += `\n⚠️ <b>Внимание!</b> ${plantsNeedingWater} растени${plantsNeedingWater === 1 ? 'е требует' : plantsNeedingWater < 5 ? 'я требуют' : 'й требуют'} полива!`;
                }

                const success = await this.sendTelegramMessage(message);
                
                if (success) {
                    this.showTelegramStatus('success', '✅ Статус растений отправлен в Telegram');
                } else {
                    this.showTelegramStatus('error', '❌ Не удалось отправить сообщение');
                }
            }

            showTelegramStatus(type, message) {
                const statusDiv = document.getElementById('telegram-connection-status');
                statusDiv.className = `p-3 rounded-lg text-sm whitespace-pre-line ${
                    type === 'success' ? 'bg-green-600/20 border border-green-600/30 text-green-400' :
                    type === 'error' ? 'bg-red-600/20 border border-red-600/30 text-red-400' :
                    'bg-blue-600/20 border border-blue-600/30 text-blue-400'
                }`;
                statusDiv.textContent = message;
                statusDiv.classList.remove('hidden');
                
                if (type !== 'loading') {
                    setTimeout(() => statusDiv.classList.add('hidden'), 8000);
                }
            }

            // Notification triggers
            async notifyWateringNeeded(plantIds) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.wateringReminders) {
                    return;
                }

                const plants = plantIds.map(id => this.data.plants[id]).filter(plant => plant);
                
                if (plants.length === 0) return;

                let message = `💧 <b>Напоминание о поливе</b>\n\n`;
                
                plants.forEach(plant => {
                    const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                    const currentPhase = this.getCurrentLightPhase(plant.id, new Date());
                    
                    message += `🌿 <b>${plant.name}</b>\n`;
                    message += `   ${this.getPhaseIcon(currentPhase?.type || 'unknown')} ${this.getPhaseShortName(currentPhase?.type || 'unknown')}\n`;
                    message += `   ⏰ ${daysSinceWatering} дн. без полива\n\n`;
                });

                message += `🎯 <i>Откройте Plant Care Pro для быстрого полива</i>`;

                await this.sendTelegramMessage(message);
            }

            async notifyPhaseChange(plantId, newPhase) {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.phaseChanges) {
                    return;
                }

                const plant = this.data.plants[plantId];
                if (!plant) return;

                const phaseIcon = this.getPhaseIcon(newPhase.type);
                const phaseName = this.getPhaseDisplayName(newPhase.type);

                let message = `🔄 <b>Смена фазы роста</b>\n\n`;
                message += `🌿 <b>${plant.name}</b>\n`;
                message += `${phaseIcon} Переход в фазу: <b>${phaseName}</b>\n`;
                message += `📅 Дата: ${new Date().toLocaleDateString('ru-RU')}\n`;

                // Recommendations based on phase
                if (newPhase.type === 'flowering') {
                    message += `\n💡 <b>Рекомендации:</b>\n`;
                    message += `• Переключите световой режим на 12/12\n`;
                    message += `• Используйте удобрения для цветения\n`;
                    message += `• Следите за влажностью`;
                } else if (newPhase.type === 'drying') {
                    message += `\n💡 <b>Рекомендации:</b>\n`;
                    message += `• Прекратите полив\n`;
                    message += `• Выключите освещение\n`;
                    message += `• Поддерживайте температуру 18-22°C`;
                }

                await this.sendTelegramMessage(message);
            }

            async sendDailySummary() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.dailySummary) {
                    return;
                }

                // Check if summary was already sent today
                const today = new Date().toDateString();
                const lastSummary = telegramSettings.lastDailySummary;
                
                if (lastSummary && new Date(lastSummary).toDateString() === today) {
                    return; // Already sent today
                }

                const plants = Object.values(this.data.plants);
                
                if (plants.length === 0) return;

                let message = `🌅 <b>Ежедневная сводка</b>\n`;
                message += `📅 ${new Date().toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    day: '2-digit', 
                    month: 'long' 
                })}\n\n`;

                let activePlants = 0;
                let plantsNeedingWater = 0;
                let plantsWateredToday = 0;

                // Check today's waterings
                const todayStr = this.getLocalDateString(new Date());
                const todayWaterings = Object.values(this.data.wateringHistory).filter(watering => {
                    const wateringDate = this.getLocalDateString(new Date(watering.date));
                    return wateringDate === todayStr;
                });

                const wateredPlantIds = new Set();
                todayWaterings.forEach(watering => {
                    watering.plantIds.forEach(id => wateredPlantIds.add(id));
                });

                plantsWateredToday = wateredPlantIds.size;

                plants.forEach(plant => {
                    const isActive = this.isPlantActive(plant);
                    const needsWatering = this.needsWatering(plant.id);
                    
                    if (isActive) activePlants++;
                    if (needsWatering) plantsNeedingWater++;
                });

                message += `📊 <b>Статистика:</b>\n`;
                message += `• Активных растений: ${activePlants}/${plants.length}\n`;
                message += `• Полито сегодня: ${plantsWateredToday}\n`;
                message += `• Требуют полива: ${plantsNeedingWater}\n`;

                if (plantsNeedingWater > 0) {
                    message += `\n⚠️ <b>Требуют внимания:</b>\n`;
                    plants.forEach(plant => {
                        if (this.needsWatering(plant.id)) {
                            const daysSinceWatering = this.getDaysSinceLastWatering(plant.id);
                            message += `• ${plant.name} (${daysSinceWatering} дн.)\n`;
                        }
                    });
                }

                if (todayWaterings.length > 0) {
                    message += `\n✅ <b>Поливы сегодня:</b>\n`;
                    todayWaterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        message += `• ${time}: ${watering.volume}л${recipe ? ` + ${recipe.name}` : ''}\n`;
                    });
                }

                const success = await this.sendTelegramMessage(message);
                
                if (success) {
                    // Update last summary time
                    this.data.settings.telegram.lastDailySummary = new Date().toISOString();
                    this.saveData();
                }
            }

            // Setup daily summary timer
            setupTelegramNotifications() {
                const telegramSettings = this.data.settings.telegram;
                
                if (!telegramSettings.enabled || !telegramSettings.notifications.dailySummary) {
                    return;
                }

                // Clear existing timer
                if (this.telegramTimer) {
                    clearInterval(this.telegramTimer);
                }

                // Check every minute for daily summary time
                this.telegramTimer = setInterval(() => {
                    const now = new Date();
                    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
                    const summaryTime = telegramSettings.notifications.dailyTime || '09:00';
                    
                    if (currentTime === summaryTime) {
                        this.sendDailySummary();
                    }
                }, 60000); // Check every minute
            }

            exportData() {
                const dataStr = JSON.stringify(this.data, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(dataBlob);
                link.download = `plant-care-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                this.showNotification('📁 Данные экспортированы', 'success');
            }

            importData() {
                document.getElementById('data-import-input').click();
            }

            handleDataImport(e) {
                const file = e.target.files[0];
                if (!file) return;
                
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importedData = JSON.parse(event.target.result);
                        
                        // Validate data structure
                        if (!importedData.plants || !importedData.settings) {
                            throw new Error('Неверный формат файла');
                        }
                        
                        // Confirm import
                        const plantsCount = Object.keys(importedData.plants).length;
                        const wateringsCount = Object.keys(importedData.wateringHistory || {}).length;
                        
                        const confirmMessage = `Импортировать данные?\n\n` +
                            `📊 Найдено:\n` +
                            `• Растений: ${plantsCount}\n` +
                            `• Записей поливов: ${wateringsCount}\n` +
                            `• Удобрений: ${Object.keys(importedData.fertilizers || {}).length}\n` +
                            `• Рецептов: ${Object.keys(importedData.recipes || {}).length}\n\n` +
                            `⚠️ Текущие данные будут заменены!`;
                        
                        if (confirm(confirmMessage)) {
                            // Preserve current settings if not in import
                            if (this.data.settings.appTitle && !importedData.settings.appTitle) {
                                importedData.settings.appTitle = this.data.settings.appTitle;
                            }
                            if (this.data.settings.homeAssistant && !importedData.settings.homeAssistant) {
                                importedData.settings.homeAssistant = this.data.settings.homeAssistant;
                            }
                            
                            this.data = importedData;
                            this.data.settings.currentDate = new Date(this.data.settings.currentDate || new Date());
                            this.saveData();
                            
                            // Reinitialize
                            this.initializePlantPhases();
                            this.renderUI();
                            
                            this.showNotification('✅ Данные успешно импортированы', 'success');
                        }
                        
                    } catch (error) {
                        this.showNotification(`❌ Ошибка импорта: ${error.message}`, 'error');
                    }
                    
                    // Reset file input
                    e.target.value = '';
                };
                
                reader.readAsText(file);
            }

            // History rendering
            renderWateringHistory() {
                this.renderHistoryFilters();
                this.renderHistoryStats();
                this.renderHistoryList();
                
                // Add event listeners for filters
                document.getElementById('history-plant-filter').addEventListener('change', () => this.renderHistoryList());
                document.getElementById('history-period-filter').addEventListener('change', () => this.renderHistoryList());
            }

            renderHistoryFilters() {
                const plantFilter = document.getElementById('history-plant-filter');
                const plants = Object.values(this.data.plants);
                
                plantFilter.innerHTML = '<option value="">Все растения</option>';
                plants.forEach(plant => {
                    const option = document.createElement('option');
                    option.value = plant.id;
                    option.textContent = plant.name;
                    plantFilter.appendChild(option);
                });
            }

            getFilteredWaterings() {
                const plantFilter = document.getElementById('history-plant-filter')?.value || '';
                const periodFilter = document.getElementById('history-period-filter')?.value || '30';
                
                let waterings = Object.values(this.data.wateringHistory);
                
                // Filter by plant
                if (plantFilter) {
                    waterings = waterings.filter(watering => watering.plantIds.includes(plantFilter));
                }
                
                // Filter by period
                if (periodFilter !== 'all') {
                    const daysAgo = parseInt(periodFilter);
                    const cutoffDate = new Date();
                    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
                    
                    waterings = waterings.filter(watering => new Date(watering.date) >= cutoffDate);
                }
                
                // Sort by date (newest first)
                return waterings.sort((a, b) => new Date(b.date) - new Date(a.date));
            }

            renderHistoryStats() {
                const waterings = this.getFilteredWaterings();
                
                const totalWaterings = waterings.length;
                const totalVolume = waterings.reduce((sum, w) => sum + w.volume, 0);
                const averageVolume = totalWaterings > 0 ? totalVolume / totalWaterings : 0;
                
                // Find most popular recipe
                const recipeCounts = {};
                waterings.forEach(watering => {
                    if (watering.recipeId) {
                        recipeCounts[watering.recipeId] = (recipeCounts[watering.recipeId] || 0) + 1;
                    }
                });
                
                let popularRecipe = 'Только вода';
                let maxCount = 0;
                Object.entries(recipeCounts).forEach(([recipeId, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        const recipe = this.data.recipes[recipeId];
                        if (recipe) {
                            popularRecipe = recipe.name;
                        }
                    }
                });
                
                document.getElementById('total-waterings').textContent = totalWaterings;
                document.getElementById('total-volume').textContent = totalVolume.toFixed(1) + 'л';
                document.getElementById('average-volume').textContent = averageVolume.toFixed(1) + 'л';
                document.getElementById('popular-recipe').textContent = popularRecipe;
            }

            renderHistoryList() {
                const container = document.getElementById('watering-history-list');
                const waterings = this.getFilteredWaterings();
                
                container.innerHTML = '';
                
                if (waterings.length === 0) {
                    container.innerHTML = `
                        <div class="text-center py-12 text-gray-400">
                            <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            <div class="text-lg font-medium mb-2">Нет записей о поливе</div>
                            <div class="text-sm">Записи появятся здесь после выполнения поливов</div>
                        </div>
                    `;
                    this.renderHistoryStats(); // Update stats for empty state
                    return;
                }
                
                // Group waterings by date
                const wateringsByDate = {};
                waterings.forEach(watering => {
                    const dateStr = new Date(watering.date).toLocaleDateString('ru-RU');
                    if (!wateringsByDate[dateStr]) {
                        wateringsByDate[dateStr] = [];
                    }
                    wateringsByDate[dateStr].push(watering);
                });
                
                Object.entries(wateringsByDate).forEach(([dateStr, dayWaterings]) => {
                    // Date header
                    const dateHeader = document.createElement('div');
                    dateHeader.className = 'flex items-center gap-3 py-3 px-4 bg-gray-800 rounded-lg mb-2 sticky top-0 z-10';
                    
                    const date = new Date(dayWaterings[0].date);
                    const isToday = date.toLocaleDateString('ru-RU') === new Date().toLocaleDateString('ru-RU');
                    const isYesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString('ru-RU') === date.toLocaleDateString('ru-RU');
                    
                    let dateLabel = dateStr;
                    if (isToday) dateLabel = `Сегодня • ${dateStr}`;
                    else if (isYesterday) dateLabel = `Вчера • ${dateStr}`;
                    
                    dateHeader.innerHTML = `
                        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        <span class="font-medium">${dateLabel}</span>
                        <span class="text-sm text-gray-400">${dayWaterings.length} полив${dayWaterings.length === 1 ? '' : dayWaterings.length < 5 ? 'а' : 'ов'}</span>
                    `;
                    container.appendChild(dateHeader);
                    
                    // Waterings for this date
                    dayWaterings.forEach(watering => {
                        const time = new Date(watering.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        const recipe = watering.recipeId ? this.data.recipes[watering.recipeId] : null;
                        const plantsNames = watering.plantIds.map(id => this.data.plants[id]?.name || 'Удаленное растение').join(', ');
                        
                        const wateringCard = document.createElement('div');
                        wateringCard.className = 'bg-dark p-4 rounded-lg ml-8 mb-2 group hover:bg-gray-800 transition-colors';
                        wateringCard.innerHTML = `
                            <div class="flex items-start justify-between">
                                <div class="flex items-start gap-3 flex-1">
                                    <div class="bg-blue-600/20 p-2 rounded-lg">
                                        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"></path>
                                        </svg>
                                    </div>
                                    <div class="flex-1">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="font-medium text-lg">${watering.volume}л</span>
                                            <span class="text-gray-400">•</span>
                                            <span class="text-gray-300">${time}</span>
                                            ${recipe ? `
                                                <span class="text-gray-400">•</span>
                                                <span class="text-primary text-sm font-medium">${recipe.name}</span>
                                            ` : `
                                                <span class="text-gray-400">•</span>
                                                <span class="text-gray-500 text-sm">только вода</span>
                                            `}
                                        </div>
                                        <div class="text-sm text-gray-400 mb-2">
                                            🌿 ${plantsNames}
                                        </div>
                                        ${watering.notes ? `
                                            <div class="text-sm text-gray-300 bg-gray-700/50 p-2 rounded italic">
                                                "${watering.notes}"
                                            </div>
                                        ` : ''}
                                        ${recipe ? `
                                            <div class="mt-2 text-xs text-gray-500">
                                                ${recipe.fertilizers.map(fert => {
                                                    const fertilizer = this.data.fertilizers[fert.fertilizerId];
                                                    if (fertilizer) {
                                                        const totalAmount = (fert.dose * watering.volume).toFixed(1);
                                                        return `${fertilizer.name}: ${totalAmount}мл`;
                                                    }
                                                    return '';
                                                }).filter(Boolean).join(' • ')}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                                <button onclick="app.deleteWateringConfirm('${watering.id}')" 
                                        class="opacity-0 group-hover:opacity-100 p-2 bg-red-600/20 hover:bg-red-600/40 rounded-lg transition-all duration-200"
                                        title="Удалить запись о поливе">
                                    <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                    </svg>
                                </button>
                            </div>
                        `;
                        container.appendChild(wateringCard);
                    });
                });
                
                this.renderHistoryStats(); // Update stats after rendering
            }
        }

        // Initialize app
        window.app = new PlantCareApp();
