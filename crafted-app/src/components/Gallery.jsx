import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const SPEED = 40 // pixels per second, change to go faster or slower

const SHOTS = [
  { img: '/assets/fade_b&w.png', title: 'Haircuts & Fades' },
  { img: '/assets/shave_b&w.png', title: 'Shave & Beard Trims' },
  { img: '/assets/treatment_b&w.png', title: 'Hair Treatments' },
  { img: '/assets/kid_b&w.png', title: 'Kids & Seniors' },
]

export default function Gallery() {
  const trackRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    const shots = track.querySelectorAll('.shot')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let isDown = false
    let moved = false // true while a mouse drag is in progress, so a drag doesn't count as a click on a card
    let hovered = false
    let focused = false // the track holds still while the pointer or keyboard focus is on a card
    let startX = 0
    let startScroll = 0
    let pos = 0
    let last = null
    let raf

    // Width of one full set of images (including the gaps)
    const loopWidth = () => shots[shots.length / 2].offsetLeft - shots[0].offsetLeft

    const tick = (time) => {
      if (last !== null && !isDown && !hovered && !focused && !reduceMotion) {
        pos += (SPEED * (time - last)) / 1000
      } else {
        pos = track.scrollLeft // stay in sync while dragging
      }
      last = time

      const width = loopWidth()
      if (pos >= width) pos -= width // wrap forward
      if (pos < 0) pos += width // wrap backward (when dragging right)

      track.scrollLeft = pos
      raf = requestAnimationFrame(tick)
    }

    const onDown = (e) => {
      isDown = true
      moved = false
      startX = e.pageX
      startScroll = track.scrollLeft
      track.classList.add('dragging')
    }
    const onUp = () => {
      isDown = false
      track.classList.remove('dragging')
      setTimeout(() => { moved = false }, 0) // after the click that follows mouseup
    }
    const onMove = (e) => {
      if (!isDown) return
      if (Math.abs(e.pageX - startX) > 5) moved = true
      track.scrollLeft = startScroll - (e.pageX - startX)
    }

    const onClick = (e) => { if (moved) e.preventDefault() } // a drag must not open a card
    const onEnter = () => { hovered = true }
    const onLeave = () => { hovered = false }
    const onFocusIn = () => { focused = true }
    const onFocusOut = () => { focused = false }

    track.addEventListener('mousedown', onDown)
    track.addEventListener('click', onClick, true)
    track.addEventListener('mouseenter', onEnter)
    track.addEventListener('mouseleave', onLeave)
    track.addEventListener('focusin', onFocusIn)
    track.addEventListener('focusout', onFocusOut)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onMove)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      track.removeEventListener('mousedown', onDown)
      track.removeEventListener('click', onClick, true)
      track.removeEventListener('mouseenter', onEnter)
      track.removeEventListener('mouseleave', onLeave)
      track.removeEventListener('focusin', onFocusIn)
      track.removeEventListener('focusout', onFocusOut)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
    }
  }, [])

  // Images are rendered twice so the loop has no visible jump
  const loop = [...SHOTS, ...SHOTS]

  return (
    <div className="track" ref={trackRef}>
      {loop.map((s, i) => (
        // Each card opens the existing booking flow (/book); the repeated copies stay out of the tab order
        <Link className="shot" key={i} to="/book" draggable={false} aria-label={`Book ${s.title}`}
          aria-hidden={i >= SHOTS.length ? 'true' : undefined} tabIndex={i >= SHOTS.length ? -1 : undefined}>
          <div className="ph ph-fill">
            <img src={s.img} alt="" />
            <div className="shot-title">{s.title}</div>
          </div>
        </Link>
      ))}
    </div>
  )
}
