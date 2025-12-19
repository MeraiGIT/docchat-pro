'use client'

import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { MeshTransmissionMaterial, Sparkles, Environment, Float } from '@react-three/drei'
import * as THREE from 'three'

// WebGL Context Loss Handler
function WebGLContextHandler() {
  const { gl } = useThree()
  
  useEffect(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      console.warn('WebGL context lost, attempting to restore...')
    }
    
    const handleContextRestored = () => {
      console.log('WebGL context restored')
      gl.forceContextRestore()
    }
    
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)
    
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      canvas.removeEventListener('webglcontextrestored', handleContextRestored)
    }
  }, [gl])
  
  return null
}

function TorusKnot({ mouse }: { mouse: [number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const targetRotation = useRef({ x: 0, y: 0 })

  useEffect(() => {
    targetRotation.current = {
      x: mouse[1] * 0.3,
      y: mouse[0] * 0.3,
    }
  }, [mouse])

  useFrame((state) => {
    if (!meshRef.current) return

    // Slow continuous rotation
    meshRef.current.rotation.x += 0.005
    meshRef.current.rotation.y += 0.01

    // Smooth mouse following with spring-like physics
    const currentX = meshRef.current.rotation.x
    const currentY = meshRef.current.rotation.y
    const targetX = targetRotation.current.x
    const targetY = targetRotation.current.y

    meshRef.current.rotation.x += (targetX - currentX) * 0.05
    meshRef.current.rotation.y += (targetY - currentY) * 0.05

    // Pulsing scale effect
    const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    meshRef.current.scale.setScalar(scale)
  })

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={[0, 0, 0]} scale={[2.5, 2.5, 2.5]}>
        {/* Reduced geometry complexity for better performance */}
        <torusKnotGeometry args={[1, 0.3, 64, 16]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          resolution={256}
          transmission={0.9}
          thickness={0.4}
          roughness={0.2}
          chromaticAberration={0.3}
          anisotropy={0.1}
          distortion={0.05}
          distortionScale={0.05}
          temporalDistortion={0.05}
          color="#a855f7"
          metalness={0.7}
        />
      </mesh>
    </Float>
  )
}

function FloatingOrbs({ mouse }: { mouse: [number, number] }) {
  const orbs = useRef<THREE.Mesh[]>([])

  useFrame((state) => {
    orbs.current.forEach((orb, i) => {
      if (!orb) return
      const time = state.clock.elapsedTime
      const offset = i * 2
      orb.position.x = Math.sin(time * 0.5 + offset) * 3 + mouse[0] * 2
      orb.position.y = Math.cos(time * 0.3 + offset) * 2 + mouse[1] * 2
      orb.position.z = Math.sin(time * 0.4 + offset) * 2
      orb.rotation.x += 0.01
      orb.rotation.y += 0.01
    })
  })

  return (
    <>
      {[...Array(3)].map((_, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) orbs.current[i] = el
          }}
        >
          <sphereGeometry args={[0.2, 32, 32]} />
          <meshStandardMaterial
            color={i === 0 ? '#a855f7' : i === 1 ? '#3b82f6' : '#8b5cf6'}
            emissive={i === 0 ? '#a855f7' : i === 1 ? '#3b82f6' : '#8b5cf6'}
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </>
  )
}

function SparklesEffect() {
  return (
    <Sparkles
      count={50}
      scale={[15, 15, 15]}
      size={2}
      speed={0.3}
      color="#a855f7"
      opacity={0.6}
    />
  )
}

function Scene({ mouse }: { mouse: [number, number] }) {
  return (
    <>
      <WebGLContextHandler />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.0} color="#a855f7" />
      <pointLight position={[-10, -10, -10]} intensity={0.8} color="#3b82f6" />
      <pointLight position={[0, 10, -10]} intensity={0.6} color="#8b5cf6" />
      <directionalLight position={[5, 5, 5]} intensity={0.4} />
      <Suspense fallback={null}>
        <Environment preset="sunset" />
      </Suspense>
      <TorusKnot mouse={mouse} />
      <FloatingOrbs mouse={mouse} />
      <SparklesEffect />
    </>
  )
}

export function Hero3D() {
  const [mouse, setMouse] = useState<[number, number]>([0, 0])
  const [hasWebGL, setHasWebGL] = useState<boolean | null>(null)

  // Check WebGL support
  useEffect(() => {
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
        return !!gl
      } catch (e) {
        return false
      }
    }
    setHasWebGL(checkWebGL())
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      setMouse([x, y])
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Don't render if WebGL is not supported
  if (hasWebGL === false) {
    return null
  }

  return (
    <div className="fixed inset-0 z-0 pointer-events-none" style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          preserveDrawingBuffer: false,
          failIfMajorPerformanceCaveat: false,
        }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
        onCreated={({ gl }) => {
          // Enable error handling
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
          
          // Handle context loss
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            console.warn('WebGL context lost')
          })
          
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored')
          })
        }}
      >
        <Suspense fallback={null}>
          <Scene mouse={mouse} />
        </Suspense>
      </Canvas>
    </div>
  )
}

