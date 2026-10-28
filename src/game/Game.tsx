import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { FarmScene, type Bridge } from './FarmScene';
export function Game({bridge}:{bridge:Bridge}){const element=useRef<HTMLDivElement>(null);useEffect(()=>{const game=new Phaser.Game({type:Phaser.AUTO,parent:element.current!,width:800,height:600,backgroundColor:'#89b76d',pixelArt:true,roundPixels:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:new FarmScene(bridge),render:{antialias:false}});return()=>game.destroy(true)},[bridge]);return <div className="game-canvas" ref={element} aria-label="Bản đồ nông trại. Dùng WASD hoặc nút điều hướng để di chuyển, E để tương tác."/>}
