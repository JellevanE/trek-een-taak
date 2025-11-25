// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock HTMLAudioElement for useSoundFx tests
// JSDOM doesn't implement HTMLAudioElement, causing test failures
class MockAudioElement {
    constructor() {
        this.volume = 1;
        this.currentTime = 0;
        this.paused = true;
        this.ended = false;
        this.duration = 0;
        this.src = '';
        this.onended = null;
        this.onerror = null;
        this.onloadeddata = null;
    }

    play() {
        this.paused = false;
        return Promise.resolve();
    }

    pause() {
        this.paused = true;
    }

    load() {
        // Simulate successful load
        if (this.onloadeddata) {
            this.onloadeddata();
        }
    }

    addEventListener(event, handler) {
        if (event === 'ended') this.onended = handler;
        if (event === 'error') this.onerror = handler;
        if (event === 'loadeddata') this.onloadeddata = handler;
    }

    removeEventListener(event, handler) {
        if (event === 'ended' && this.onended === handler) this.onended = null;
        if (event === 'error' && this.onerror === handler) this.onerror = null;
        if (event === 'loadeddata' && this.onloadeddata === handler) this.onloadeddata = null;
    }
}

global.HTMLAudioElement = MockAudioElement;
