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
        this.table = null;
        this.tableObjects = [];
        this.createTableObjects();
        console.log('Table objects created');

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

        // Add animation state tracking
        this.isLeftPawAnimating = false;
        this.isRightPawAnimating = false;

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
        // Create table
        const tableGeometry = new THREE.BoxGeometry(8, 0.1, 8); // Doubled table size
        const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        this.table = new THREE.Mesh(tableGeometry, tableMaterial);
        this.table.position.set(0, -0.5, 0);
        this.scene.add(this.table);

        // Create objects on table
        const objectCount = 30;
        const tableSize = 7; // Increased to match larger table (slightly smaller than table to keep objects on table)
        const objectTypes = [
            { geometry: new THREE.BoxGeometry(0.2, 0.2, 0.2), color: 0xFF0000 },
            { geometry: new THREE.SphereGeometry(0.1, 16, 16), color: 0x00FF00 },
            { geometry: new THREE.ConeGeometry(0.1, 0.2, 16), color: 0x0000FF }
        ];

        for (let i = 0; i < objectCount; i++) {
            const type = objectTypes[Math.floor(Math.random() * objectTypes.length)];
            const object = new THREE.Mesh(
                type.geometry,
                new THREE.MeshStandardMaterial({ color: type.color })
            );

            // Random position within table bounds
            object.position.set(
                (Math.random() - 0.5) * tableSize,
                -0.4, // Just above table
                (Math.random() - 0.5) * tableSize
            );

            // Random rotation
            object.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            this.tableObjects.push(object);
            this.scene.add(object);
        }
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
        // Don't start new animation if one is already running
        if (this.isLeftPawAnimating) return;
        
        this.isLeftPawAnimating = true;
        
        // Store original positions and rotations
        const originalRotation = this.leftPaw.rotation.y;
        const originalPosition = {
            x: this.leftPaw.position.x,
            z: this.leftPaw.position.z
        };
        
        // Animate left paw swiping
        const startTime = Date.now();
        const rotationDuration = 150; // Duration for rotation (half of original)
        const arcDuration = 300; // Duration for arc motion (unchanged)
        const returnDuration = 150; // Duration for return motion (half of original)
        const totalDuration = rotationDuration + arcDuration + returnDuration;

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
            } else if (progress < (rotationDuration + arcDuration) / totalDuration) {
                // Phase 2: Move in semi-circle
                const arcProgress = (progress - (rotationDuration / totalDuration)) * (totalDuration / arcDuration);
                const angle = arcProgress * Math.PI; // Move from 0 to 180 degrees
                const radius = 0.5; // Radius of the arc
                const xScale = 0.75; // Scale factor for X movement (1/2 of original)
                const zScale = 0.25; // Scale factor for Z movement (1/4 of original)
                
                // Calculate arc position relative to original position
                // Start at original position and move in semi-circle
                const dx = Math.sin(angle) * radius * xScale;
                const dz = (Math.cos(angle) - 1) * radius * zScale;
                
                // Move in semi-circle (negative X and negative Z)
                this.leftPaw.position.x = originalPosition.x - dx;
                this.leftPaw.position.z = originalPosition.z + dz;
                
                // Maintain the -90 degree rotation
                this.leftPaw.rotation.y = originalRotation - Math.PI/2;

                // Check for collisions with objects
                this.checkObjectCollisions();
            } else {
                // Phase 3: Return to starting position
                const returnProgress = (progress - ((rotationDuration + arcDuration) / totalDuration)) * (totalDuration / returnDuration);
                
                // Linear interpolation back to original position
                this.leftPaw.position.x = originalPosition.x - (Math.sin(Math.PI) * 0.5 * 0.5 * (1 - returnProgress)); // Scale X movement by 1/2
                this.leftPaw.position.z = originalPosition.z + ((Math.cos(Math.PI) - 1) * 0.5 * 0.25 * (1 - returnProgress)); // Scale Z movement by 1/4
                
                // Rotate back to original rotation
                this.leftPaw.rotation.y = originalRotation - (Math.PI/2 * (1 - returnProgress));
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
                this.isLeftPawAnimating = false; // Reset animation state
            }
        };

        // Start the animation
        animateSwipe();
    }

    swipeRightPaw() {
        // Don't start new animation if one is already running
        if (this.isRightPawAnimating) return;
        
        this.isRightPawAnimating = true;
        
        // Store original positions and rotations
        const originalRotation = this.rightPaw.rotation.y;
        const originalPosition = {
            x: this.rightPaw.position.x,
            z: this.rightPaw.position.z
        };
        
        // Animate right paw swiping
        const startTime = Date.now();
        const rotationDuration = 150; // Duration for rotation (half of original)
        const arcDuration = 350; // Duration for arc motion (unchanged)
        const returnDuration = 150; // Duration for return motion (half of original)
        const totalDuration = rotationDuration + arcDuration + returnDuration;

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
            } else if (progress < (rotationDuration + arcDuration) / totalDuration) {
                // Phase 2: Move in semi-circle
                const arcProgress = (progress - (rotationDuration / totalDuration)) * (totalDuration / arcDuration);
                const angle = arcProgress * Math.PI; // Move from 0 to 180 degrees
                const radius = 0.5; // Radius of the arc
                const xScale = 0.75; // Scale factor for X movement (1/2 of original)
                const zScale = 0.25; // Scale factor for Z movement (1/4 of original)
                
                // Calculate arc position relative to original position
                // Start at original position and move in semi-circle
                const dx = Math.sin(angle) * radius * xScale;
                const dz = (Math.cos(angle) - 1) * radius * zScale;
                
                // Move in semi-circle (positive X and negative Z)
                this.rightPaw.position.x = originalPosition.x + dx;
                this.rightPaw.position.z = originalPosition.z + dz;
                
                // Maintain the 90 degree rotation
                this.rightPaw.rotation.y = originalRotation + Math.PI/2;

                // Check for collisions with objects
                this.checkObjectCollisions();
            } else {
                // Phase 3: Return to starting position
                const returnProgress = (progress - ((rotationDuration + arcDuration) / totalDuration)) * (totalDuration / returnDuration);
                
                // Linear interpolation back to original position
                this.rightPaw.position.x = originalPosition.x + (Math.sin(Math.PI) * 0.5 * 0.5 * (1 - returnProgress)); // Scale X movement by 1/2
                this.rightPaw.position.z = originalPosition.z + ((Math.cos(Math.PI) - 1) * 0.5 * 0.25 * (1 - returnProgress)); // Scale Z movement by 1/4
                
                // Rotate back to original rotation
                this.rightPaw.rotation.y = originalRotation + (Math.PI/2 * (1 - returnProgress));
            }
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animateSwipe);
            } else {
                // Reset paw to original position and rotation
                this.rightPaw.rotation.y = originalRotation;
                this.rightPaw.position.x = originalPosition.x;
                this.rightPaw.position.z = originalPosition.z;
                this.isRightPawAnimating = false; // Reset animation state
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

        this.tableObjects.forEach(obj => {
            // Skip if object has already been hit
            if (obj.userData.isKnocked) return;

            const distance = cameraPosition.distanceTo(obj.position);
            if (distance < 1.5) {
                // Knock object off table
                obj.userData.isKnocked = true;
                
                // Get the cat's right vector (perpendicular to facing direction)
                const rightVector = new THREE.Vector3(1, 0, 0);
                rightVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                
                // Get the cat's forward vector (negated to go forward)
                const forwardVector = new THREE.Vector3(0, 0, -1);
                forwardVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                
                // Determine direction based on which paw is animating
                let horizontalForce = 0;
                if (this.isLeftPawAnimating) {
                    horizontalForce = 0.03 + (Math.random() - 0.5) * 0.1; // Base 0.03 ± 0.05
                } else if (this.isRightPawAnimating) {
                    horizontalForce = -0.03 + (Math.random() - 0.5) * 0.1; // Base -0.03 ± 0.05
                }
                
                // Apply the force in the cat's local space
                obj.userData.velocity = new THREE.Vector3(
                    rightVector.x * horizontalForce + forwardVector.x * 0.02,
                    Math.random() * 0.1, // Random height between 0 and 0.1
                    rightVector.z * horizontalForce + forwardVector.z * 0.02
                );
                
                // Increment score when object is hit
                this.updateScore();
            }
        });
    }

    updateObjects() {
        this.tableObjects.forEach(obj => {
            if (obj.userData.isKnocked) {
                // Apply gravity
                obj.userData.velocity.y -= 0.01;
                
                // Update position
                obj.position.add(obj.userData.velocity);
                
                // Check if object is over the table
                const isOverTable = Math.abs(obj.position.x) < 4 && Math.abs(obj.position.z) < 4;
                
                if (isOverTable) {
                    // Bounce off table (table is at y = -0.5)
                    if (obj.position.y < -0.4) { // Slightly above table to prevent clipping
                        obj.position.y = -0.4;
                        obj.userData.velocity.y *= -0.4; // Increased dampening (was 0.6)
                        
                        // Increased friction when touching table
                        obj.userData.velocity.x *= 0.85; // More horizontal friction (was 0.95)
                        obj.userData.velocity.z *= 0.85;
                        
                        // Apply additional dampening to very small movements
                        if (Math.abs(obj.userData.velocity.x) < 0.01) obj.userData.velocity.x = 0;
                        if (Math.abs(obj.userData.velocity.z) < 0.01) obj.userData.velocity.z = 0;
                        if (Math.abs(obj.userData.velocity.y) < 0.01) obj.userData.velocity.y = 0;
                        
                        // Reset isKnocked if object has come to a complete stop
                        if (obj.userData.velocity.length() < 0.01) {
                            obj.userData.isKnocked = false;
                        }
                    }
                } else {
                    // If off the table, let it fall until it hits the ground
                    if (obj.position.y < -2) {
                        obj.position.y = -2;
                        obj.userData.velocity.set(0, 0, 0);
                        obj.userData.isKnocked = false; // Reset isKnocked when it hits the ground
                    }
                }
                
                // Add some rotation based on movement
                obj.rotation.x += obj.userData.velocity.z * 0.1;
                obj.rotation.z += obj.userData.velocity.x * 0.1;
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