import React, { useState } from 'react'
import { Stage, Layer, Rect, Circle, Text } from 'react-konva';

const App = () => { 

  const [rec, setRec] = useState({x : 20 , y : 50});
  const [cir, setCir] = useState({x : 40 , y : 100});

  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Text text='Its a practice session to check if i am able to create circle and rectangle or not' fontSize={20}></Text>
        {/* rectangle */}
        <Rect 
        x={rec.x}
        y={rec.y}
        width={30}
        height={20}
        fill="red"
        draggable
        />
        <Circle
        x={cir.x}
        y={cir.y}
        radius={20}
        fill="blue"
        draggable
        />
      </Layer>
    </Stage>
  )
}

export default App