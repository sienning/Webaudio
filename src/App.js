import './App.css';
import Gamepads from 'gamepads';

// import songs from './assets/songs.json';
import React, { useEffect, useState } from 'react'

const App = () => {
  const [isLeft, setIsLeft] = useState(false)
  const [isUp, setIsUp] = useState(false)
  const [isY, setIsY] = useState(false)
  const [isB, setIsB] = useState(false)
  const [isGamePlaying, setIsGamePlaying] = useState(false)
  const [gameArray, setGameArray] = useState([])

  Gamepads.start();

  // const [isPlaying, setIsPlaying] = useState(false)
  let isPlaying = false;
  let isGPlaying = false;
  const sampleSize = 1024;  // number of samples to collect before analyzing data

  // MUTE
  let context;
  let analyserNode;
  let javascriptNode;
  let amplitudeArray;     // array to hold time domain data
  let source;

  // GAME
  let contextGame;
  // let gainNodeGame;
  let sourceGame;
  // const bpm = 652 // Hail the apocalpyse
  // const bpm = 488 // Welcome to the jungle
  const bpm = 465 // Libre

  function autoCorrelate(buf, sampleRate) {
    // Implements the ACF2+ algorithm
    var SIZE = buf.length;
    var rms = 0;

    for (var i = 0; i < SIZE; i++) {
      var val = buf[i];
      rms += val * val;
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) // not enough signal
      return -1;

    var r1 = 0, r2 = SIZE - 1, thres = 0.2;
    for (var i = 0; i < SIZE / 2; i++)
      if (Math.abs(buf[i]) < thres) { r1 = i; break; }
    for (var i = 1; i < SIZE / 2; i++)
      if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

    buf = buf.slice(r1, r2);
    SIZE = buf.length;

    var c = new Array(SIZE).fill(0);
    for (var i = 0; i < SIZE; i++)
      for (var j = 0; j < SIZE - i; j++)
        c[i] = c[i] + buf[j] * buf[j + i];

    var d = 0; while (c[d] > c[d + 1]) d++;
    var maxval = -1, maxpos = -1;
    for (var i = d; i < SIZE; i++) {
      if (c[i] > maxval) {
        maxval = c[i];
        maxpos = i;
      }
    }
    var T0 = maxpos;

    var x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
    var a = (x1 + x3 - 2 * x2) / 2;
    var b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return sampleRate / T0;
  }
  function noteFromPitch(frequency) {
    var noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
    return Math.round(noteNum) + 69;
  }

  function setupAudioNodes() {
    console.log("setupAudioNodes");
    source = context.createBufferSource();
    analyserNode = context.createAnalyser();
    // gainNode = context.createGain()
    analyserNode.minDecibels = -50;
    analyserNode.maxDecibels = -10;
    analyserNode.fftSize = 256
    javascriptNode = context.createScriptProcessor(sampleSize, 1, 1);

    // Create the array for the data values
    amplitudeArray = new Uint8Array(analyserNode.frequencyBinCount);

    sourceGame = contextGame.createBufferSource();
    // gainNodeGame = contextGame.createGain()

    // sourceGame.connect(gainNodeGame);
    // gainNodeGame.connect(contextGame.destination);
    sourceGame.connect(contextGame.destination);


    // Now connect the nodes together
    // source.connect(gainNode);
    source.connect(analyserNode);
    analyserNode.connect(javascriptNode);
    javascriptNode.connect(context.destination);
    // gainNode.connect(context.destination);
    // gainNode.gain.setValueAtTime(0, context.currentTime)
  }


  function play(audioBuffer) {
    console.log("play");
    source.buffer = audioBuffer;
    source.start();
    // isPlaying = true
  }

  function playGame(audioBuffer) {
    console.log("playGame");
    sourceGame.buffer = audioBuffer;
    sourceGame.start();
    // isPlaying = true
  }

  function playNotes() {
    console.log("playNotes");
    if (gameArray.length > 0 && isGPlaying) {
      let ga = gameArray
      // console.log(ga);
      if (ga[0] === "left") {
        setIsLeft(true)
      }
      if (ga[0] === "up") {
        setIsUp(true)
      }
      if (ga[0] === "y") {
        setIsY(true)
      }
      if (ga[0] === "b") {
        setIsB(true)
      }
      console.log(ga[0]);
      ga.splice(0, 1)
      setGameArray([...ga])
    }
  }

  // const loop = useCallback(() => {
  const loop = () => {
    if (isPlaying) {
      let veryLow = 0
      let low = 0
      let high = 0
      let veryHigh = 0
      let gameArr = gameArray

      // updatePitch()
      var buf = new Float32Array(2048);
      analyserNode.getFloatTimeDomainData(buf);
      // console.log(analyserNode.getFloatTimeDomainData(buf));
      // console.log("context.sampleRate : ", context.sampleRate);

      var pitch = autoCorrelate(buf, context.sampleRate);
      // console.log("pitch : ", pitch);

      var note = noteFromPitch(pitch);
      // console.log("note : ", note);
      if ((note % 12) >= 0 && (note % 12) <= 2) {
        veryLow++
      }
      if ((note % 12) >= 3 && (note % 12) <= 5) {
        low++
      }
      if ((note % 12) >= 6 && (note % 12) <= 8) {
        high++
      }
      if ((note % 12) >= 9 && (note % 12) <= 11) {
        veryHigh++
      }

      if (veryLow > low && veryLow > high && veryLow > veryHigh) {
        gameArr.push("left")
        // setIsLeft(true)
      }
      if (low > veryLow && low > high && low > veryHigh) {
        gameArr.push("up")
        // setIsUp(true)
      }
      if (high > veryLow && high > low && high > veryHigh) {
        gameArr.push("y")
        // setIsY(true)
      }
      if (veryHigh > veryLow && veryHigh > low && veryHigh > high) {
        gameArr.push("b")
        // setIsB(true)
      } else {
        gameArr.push("empty")
      }

      setGameArray([...gameArr])
      // console.log("gameArr :  ", gameArr);


      // playNotes(gameArr);


      // console.log("veryLow : ", veryLow);
      // console.log("low : ", low);
      // console.log("high : ", high);
      // console.log("veryHigh : ", veryHigh);
    } else {
      source.stop()
      sourceGame.stop()
    }
    // }, [amplitudeArray, analyserNode, context, gainNode, isPlaying, source])
  }

  function handleStop() {
    console.log("Stoop");
    isPlaying = false
    // setIsGamePlaying(false)

    // setIsPlaying(false)

    // source.stop()
    sourceGame.stop()

    setIsLeft(false)
    setIsUp(false)
    setIsY(false)
    setIsB(false)
  }

  const handlePlay = () => {
    context = new AudioContext()
    contextGame = new AudioContext()
    setupAudioNodes()

    // setIsPlaying(true)
    isPlaying = true
    let musicBuffer;
    let gameBuffer;
    window.fetch('assets/songs-audio/angele-acapella.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        musicBuffer = audioBuffer;
        window.fetch('assets/songs-audio/angele.mp3')
          .then(response => response.arrayBuffer())
          .then(arrayBuffer => context.decodeAudioData(arrayBuffer))
          .then(audioBuffer => {
            gameBuffer = audioBuffer;
            play(musicBuffer); // MUTE MUSIC (ACAPELLA)

            handleLoop()

            setTimeout(() => {
              setIsGamePlaying(true)
              isGPlaying = true
              playGame(gameBuffer) // GAME MUSIC
            }, bpm * 4)
          });
      });
  }

  function handleLoop() {
    console.log("handleLoop");
    javascriptNode.onaudioprocess = setInterval(() => {
      // get the Time Domain data for this sample
      analyserNode.getByteTimeDomainData(amplitudeArray);
      loop();
    }, bpm)
  }

  useEffect(() => {
    if (isLeft) {
      setTimeout(() => {
        setIsLeft(false)
      }, bpm * 4)
    }
  }, [isLeft])

  useEffect(() => {
    if (isB) {
      setTimeout(() => {
        setIsB(false)
      }, bpm * 4)
    }
  }, [isB])

  useEffect(() => {
    if (isUp) {
      setTimeout(() => {
        setIsUp(false)
      }, bpm * 4)
    }
  }, [isUp])

  useEffect(() => {
    if (isY) {
      setTimeout(() => {
        setIsY(false)
      }, bpm * 4)
    }
  }, [isY])

  useEffect(() => {
    const interval = setInterval(() => {
      console.log("INTERVAL");
      playNotes()
    }, bpm);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Add event listeners
  Gamepads.addEventListener('connect', e => {
    console.log('Gamepad connected');
    console.log(e.gamepad);
    e.gamepad.addEventListener('buttonpress', e => {
      console.log(e.index);
      if (e.index === 1) {
        console.log("Bouton B");
      } else if (e.index === 3) {
        console.log("Bouton Y");
      } else if (e.index === 12) {
        console.log("Bouton up");
      } else if (e.index === 14) {
        console.log("Bouton left");
      }
    });
  });

  return (
    <div className="App">
      <div>

        <h1 className='title'>Voice Hero</h1>
        <div>
          <div>
            <h2 className='button-play' onClick={handlePlay} >Play</h2>
            {/* <button onClick={handleStop} >Stop</button> */}
          </div>
          <div style={{ display: "inline-flex" }}>
            {/* <div style={{ margin: 20 }} >{isLeft ? "Left" : "_"}</div>
            <div style={{ margin: 20 }} >{isUp ? "Up" : "_"}</div>
            <div style={{ margin: 20 }} >{isY ? "Y" : "_"}</div>
            <div style={{ margin: 20 }} >{isB ? "B" : "_"}</div> */}
            <div className={isLeft ? 'button-controller active' : "button-controller"} style={{ margin: 20 }} >{isLeft ? "Left" : "_"}</div>
            <div className={isUp ? 'button-controller active' : "button-controller"} style={{ margin: 20 }} >{isUp ? "Up" : "_"}</div>
            <div className={isY ? 'button-controller active' : "button-controller"} style={{ margin: 20 }} >{isY ? "Y" : "_"}</div>
            <div className={isB ? 'button-controller active' : "button-controller"} style={{ margin: 20 }} >{isB ? "B" : "_"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
