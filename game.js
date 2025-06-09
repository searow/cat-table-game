class CatGame {
    constructor() {
        console.log('Initializing game...');
        
        // Initialize score
        this.score = 0;
        this.scoreElement = document.getElementById('score');
        
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Light blue background
        
        // Camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 0);
        
        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        console.log('Renderer initialized');

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);
        console.log('Lights added');

        // Table
        const tableGeometry = new THREE.BoxGeometry(10, 0.5, 6);
        const tableMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        this.table = new THREE.Mesh(tableGeometry, tableMaterial);
        this.table.position.y = -1;
        this.scene.add(this.table);
        console.log('Table added');

        // Initialize paws as null
        this.leftPaw = null;
        this.rightPaw = null;
        
        // Load the paw model
        this.loadPawModel().then(() => {
            console.log('Paws loaded successfully');
        }).catch(error => {
            console.error('Error loading paws:', error);
        });
        
        // Add camera to scene
        this.scene.add(this.camera);

        // Movement and rotation state
        this.pressedKeys = new Set();  // Track pressed keys
        this.moveSpeed = 0.05;
        this.rotationSpeed = 0.03;
        this.rotation = 0;

        // Event listeners
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));

        // Objects on table
        this.objects = [];
        this.createTableObjects();
        console.log('Table objects created');

        // Start animation
        this.animate();
        console.log('Game initialization complete');
    }

    async loadPawModel() {
        const loader = new THREE.FBXLoader();
        
        try {
            console.log('Starting to load FBX model...');
            const fbx = await new Promise((resolve, reject) => {
                loader.load(
                    'assets/CatPawHands.fbx',
                    (object) => {
                        console.log('FBX model loaded successfully:', object);
                        console.log('Model structure:', {
                            position: object.position,
                            rotation: object.rotation,
                            scale: object.scale,
                            children: object.children.map(child => ({
                                name: child.name,
                                type: child.type,
                                position: child.position,
                                rotation: child.rotation,
                                scale: child.scale
                            }))
                        });
                        resolve(object);
                    },
                    (xhr) => {
                        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    (error) => {
                        console.error('Error loading FBX:', error);
                        reject(error);
                    }
                );
            });

            // Scale and position the model appropriately
            fbx.scale.set(0.0024, 0.0024, 0.0024); // Double the previous size
            console.log('Model scaled');
            
            // Create left paw
            this.leftPaw = fbx.clone();
            this.leftPaw.position.set(-0.2, -0.2, -0.1); // Moved Z from -0.15 to -0.1
            this.leftPaw.rotation.set(-Math.PI/2, Math.PI + Math.PI/2, 0);
            console.log('Left paw created and positioned');
            
            // Create right paw
            this.rightPaw = fbx.clone();
            this.rightPaw.position.set(0.2, -0.2, -0.1); // Moved Z from -0.15 to -0.1
            this.rightPaw.rotation.set(-Math.PI/2, Math.PI + Math.PI/2, 0);
            console.log('Right paw created and positioned');
            
            // Add paws to camera
            this.camera.add(this.leftPaw);
            this.camera.add(this.rightPaw);
            console.log('Paws added to camera');
            
        } catch (error) {
            console.error('Error in loadPawModel:', error);
            // Fallback to basic geometry if model fails to load
            this.createBasicPaws();
        }
    }

    createBasicPaws() {
        // Create paw material
        const pawMaterial = new THREE.MeshPhongMaterial({
            color: 0xFF0000, // Bright red for visibility
            shininess: 100
        });

        // Create paw geometry
        const pawGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.6);
        
        // Create left paw
        this.leftPaw = new THREE.Mesh(pawGeometry, pawMaterial);
        this.leftPaw.position.set(-0.4, -0.3, -0.8);
        this.leftPaw.rotation.set(0, 0, -0.2);
        
        // Create right paw
        this.rightPaw = new THREE.Mesh(pawGeometry, pawMaterial);
        this.rightPaw.position.set(0.4, -0.3, -0.8);
        this.rightPaw.rotation.set(0, 0, 0.2);

        // Add paws to camera
        this.camera.add(this.leftPaw);
        this.camera.add(this.rightPaw);
    }

    createTableObjects() {
        // Create some random objects on the table
        const objects = [
            { geometry: new THREE.CylinderGeometry(0.2, 0.2, 0.4, 32), color: 0xff0000, position: [-2, 0, -1] },
            { geometry: new THREE.BoxGeometry(0.3, 0.3, 0.3), color: 0x00ff00, position: [2, 0, -1] },
            { geometry: new THREE.SphereGeometry(0.2, 32, 32), color: 0x0000ff, position: [0, 0, -2] }
        ];

        objects.forEach(obj => {
            const material = new THREE.MeshPhongMaterial({ color: obj.color });
            const mesh = new THREE.Mesh(obj.geometry, material);
            mesh.position.set(...obj.position);
            mesh.userData.isKnocked = false;
            this.objects.push(mesh);
            this.scene.add(mesh);
        });
    }

    onKeyDown(event) {
        this.pressedKeys.add(event.code);
        
        // Handle Q and E keys for independent paw movement
        if (event.code === 'KeyQ') {
            this.swipeLeftPaw();
        }
        if (event.code === 'KeyE') {
            this.swipeRightPaw();
        }
    }

    onKeyUp(event) {
        this.pressedKeys.delete(event.code);
    }

    swipeLeftPaw() {
        // Store original positions and rotations
        const originalRotation = this.leftPaw.rotation.y;
        const originalPosition = {
            x: this.leftPaw.position.x,
            z: this.leftPaw.position.z
        };
        
        // Animate left paw swiping
        const startTime = Date.now();
        const rotationDuration = 300; // Duration for rotation
        const arcDuration = 300; // Duration for arc motion
        const totalDuration = rotationDuration + arcDuration;

        const animateSwipe = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            if (progress < rotationDuration / totalDuration) {
                // Phase 1: Rotate -90 degrees
                const rotationProgress = progress * (totalDuration / rotationDuration);
                const angle = rotationProgress * -Math.PI/2; // Rotate -90 degrees
                this.leftPaw.rotation.y = originalRotation + angle;
                
                // Keep position fixed during rotation
                this.leftPaw.position.x = originalPosition.x;
                this.leftPaw.position.z = originalPosition.z;
            } else {
                // Phase 2: Move in semi-circle
                const arcProgress = (progress - (rotationDuration / totalDuration)) * (totalDuration / arcDuration);
                const angle = arcProgress * Math.PI; // Move from 0 to 180 degrees
                const radius = 0.5; // Radius of the arc
                
                // Calculate arc position relative to original position
                // Start at original position and move in semi-circle
                const dx = Math.sin(angle) * radius;
                const dz = (Math.cos(angle) - 1) * radius; // Subtract 1 to start at original position
                
                // Move in semi-circle (negative X and negative Z)
                this.leftPaw.position.x = originalPosition.x - dx;
                this.leftPaw.position.z = originalPosition.z + dz;
                
                // Maintain the -90 degree rotation
                this.leftPaw.rotation.y = originalRotation - Math.PI/2;
            }
            
            // Check for collisions with objects
            this.checkObjectCollisions();
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animateSwipe);
            } else {
                // Reset paw to original position and rotation
                this.leftPaw.rotation.y = originalRotation;
                this.leftPaw.position.x = originalPosition.x;
                this.leftPaw.position.z = originalPosition.z;
            }
        };

        // Start the animation
        animateSwipe();
    }

    swipeRightPaw() {
        // Store original positions and rotations
        const originalRotation = this.rightPaw.rotation.y;
        const originalPosition = {
            x: this.rightPaw.position.x,
            z: this.rightPaw.position.z
        };
        
        // Animate right paw swiping
        const startTime = Date.now();
        const rotationDuration = 300; // Duration for rotation
        const arcDuration = 300; // Duration for arc motion
        const totalDuration = rotationDuration + arcDuration;

        const animateSwipe = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            
            if (progress < rotationDuration / totalDuration) {
                // Phase 1: Rotate 90 degrees
                const rotationProgress = progress * (totalDuration / rotationDuration);
                const angle = rotationProgress * Math.PI/2; // Rotate 90 degrees
                this.rightPaw.rotation.y = originalRotation + angle;
                
                // Keep position fixed during rotation
                this.rightPaw.position.x = originalPosition.x;
                this.rightPaw.position.z = originalPosition.z;
            } else {
                // Phase 2: Move in semi-circle
                const arcProgress = (progress - (rotationDuration / totalDuration)) * (totalDuration / arcDuration);
                const angle = arcProgress * Math.PI; // Move from 0 to 180 degrees
                const radius = 0.5; // Radius of the arc
                
                // Calculate arc position relative to original position
                // Start at original position and move in semi-circle
                const dx = Math.sin(angle) * radius;
                const dz = (Math.cos(angle) - 1) * radius; // Subtract 1 to start at original position
                
                // Move in semi-circle (positive X and negative Z)
                this.rightPaw.position.x = originalPosition.x + dx;
                this.rightPaw.position.z = originalPosition.z + dz;
                
                // Maintain the 90 degree rotation
                this.rightPaw.rotation.y = originalRotation + Math.PI/2;
            }
            
            // Check for collisions with objects
            this.checkObjectCollisions();
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animateSwipe);
            } else {
                // Reset paw to original position and rotation
                this.rightPaw.rotation.y = originalRotation;
                this.rightPaw.position.x = originalPosition.x;
                this.rightPaw.position.z = originalPosition.z;
            }
        };

        // Start the animation
        animateSwipe();
    }

    updateScore() {
        this.score++;
        this.scoreElement.textContent = `Score: ${this.score}`;
    }

    checkObjectCollisions() {
        const cameraPosition = this.camera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.camera.quaternion);

        this.objects.forEach(obj => {
            if (obj.userData.isKnocked) return;

            const distance = cameraPosition.distanceTo(obj.position);
            if (distance < 1.5) {
                // Knock object off table
                obj.userData.isKnocked = true;
                obj.userData.velocity = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.2,
                    0.1,
                    (Math.random() - 0.5) * 0.2
                );
                // Increment score when object is hit
                this.updateScore();
            }
        });
    }

    updateObjects() {
        this.objects.forEach(obj => {
            if (obj.userData.isKnocked) {
                obj.position.add(obj.userData.velocity);
                obj.userData.velocity.y -= 0.01; // gravity
                
                // Stop when hitting the ground
                if (obj.position.y < -2) {
                    obj.position.y = -2;
                    obj.userData.velocity.set(0, 0, 0);
                }
            }
        });
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // Calculate movement direction based on rotation
        const direction = new THREE.Vector3(
            -Math.sin(this.rotation),
            0,
            -Math.cos(this.rotation)
        );
        direction.normalize();
        
        // Handle movement
        if (this.pressedKeys.has('ArrowUp')) {
            this.camera.position.add(direction.multiplyScalar(this.moveSpeed));
        }
        if (this.pressedKeys.has('ArrowDown')) {
            this.camera.position.add(direction.multiplyScalar(-this.moveSpeed));
        }
        
        // Handle rotation
        if (this.pressedKeys.has('ArrowLeft')) {
            this.rotation += this.rotationSpeed;
        }
        if (this.pressedKeys.has('ArrowRight')) {
            this.rotation -= this.rotationSpeed;
        }

        // Update camera rotation
        this.camera.rotation.y = this.rotation;

        this.updateObjects();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
console.log('Starting game...');
const game = new CatGame();

// Handle window resize
window.addEventListener('resize', () => {
    game.camera.aspect = window.innerWidth / window.innerHeight;
    game.camera.updateProjectionMatrix();
    game.renderer.setSize(window.innerWidth, window.innerHeight);
}); 