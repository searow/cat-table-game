class CatGame {
    constructor() {
        console.log('Initializing game...');
        
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

        // Cat's paws
        this.createPaws();
        console.log('Paws created');
        
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

    createPaws() {
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
        
        // Handle Enter key separately since it's not a movement key
        if (event.code === 'Enter') {
            this.swipePaws();
        }
    }

    onKeyUp(event) {
        this.pressedKeys.delete(event.code);
    }

    swipePaws() {
        // Animate paws swiping
        const startTime = Date.now();
        const duration = 500; // 500ms animation

        const animateSwipe = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Create a smooth arc motion
            const angle = Math.sin(progress * Math.PI) * 0.5;
            this.leftPaw.rotation.x = angle;
            this.rightPaw.rotation.x = -angle;
            
            // Check for collisions with objects
            this.checkObjectCollisions();
            
            // Continue animation if not complete
            if (progress < 1) {
                requestAnimationFrame(animateSwipe);
            } else {
                // Reset paws after animation
                this.leftPaw.rotation.x = 0;
                this.rightPaw.rotation.x = 0;
            }
        };

        // Start the animation
        animateSwipe();
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