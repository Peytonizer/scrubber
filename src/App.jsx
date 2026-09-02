import Header from './components/Header'
import Footer from './components/Footer'

/**
 * Top-level layout: header, a main area that will hold the dual-pane redact/re-hydrate view
 * (stage 5) and the rule drawer (stage 6), and the footer. The main area is a placeholder
 * until the engine and session store exist — see SPEC.md's build order.
 */
function App() {
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex flex-1 items-center justify-center px-8 py-16 min-[901px]:px-[72px]">
        <p className="font-mono text-[13px] text-text-faint">
          engine and interface — coming up next
        </p>
      </main>
      <Footer />
    </div>
  )
}

export default App
