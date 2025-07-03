const size=0.5;//5のとき1,10のとき0.5
var obj=[];
var m=[1,1,1,1];
var inst=[];
var vertex=[];
var bq=clifford.scalar(1);
var z=[1,0,0,0,
      0,0,0,0,
      0,0,0,0,
      0,0,0,0];
var dw=3;
var spd=3;
var rollval=0;
function generateVertex(){
    const s=size/2;
    const S=size/2;
    vertex=[
        -s,-s,-s,-S,
        s,-s,-s,-S,
        -s,s,-s,-S,
        s,s,-s,-S,
        -s,-s,s,-S,
        s,-s,s,-S,
        -s,s,s,-S,
        s,s,s,-S,

        -s,-s,-s,S,
        s,-s,-s,S,
        -s,s,-s,S,
        s,s,-s,S,
        -s,-s,s,S,
        s,-s,s,S,
        -s,s,s,S,
        s,s,s,S,
    ];
}
function generateInstance(){
inst=[];
  //x,y,z,w
    for(const o of obj){
        inst.push(o.position[0]);
        inst.push(o.position[1]);
        inst.push(o.position[2]);
        inst.push(o.position[3]);
        inst.push(o.color[0]);
        inst.push(o.color[1]);
        inst.push(o.color[2]);
        inst.push(1);
        //スケール(胞を描画するため)
        inst.push(o.vol[0]);
        inst.push(o.vol[1]);
        inst.push(o.vol[2]);
        inst.push(o.vol[3]);
        //q
        inst.push(o.z[0]);
        inst.push(o.z[5]);
        inst.push(o.z[6]);
        inst.push(o.z[7]);
        //qw
        inst.push(o.z[15]);
        inst.push(o.z[8]);
        inst.push(o.z[9]);
        inst.push(o.z[10]);
    }
};
function generateIndex(obj){
    return [
        0,1,2,1,2,3,
        4,5,6,5,6,7,
        4,0,5,0,5,1,
        2,6,3,6,3,7,
        1,5,3,5,3,7,
        0,4,2,4,2,6,

        8,9,10,9,10,11,
        12,13,14,13,14,15,
        12,8,13,8,13,9,
        10,14,11,14,11,15,
        9,13,11,13,11,15,
        8,12,10,12,10,14,
        //交差
            0,1,8,1,8,9,
            2,3,10,3,10,11,
            1,3,9,3,9,11,
            0,2,8,2,8,10,

            4,5,12,5,12,13,
            6,7,14,7,14,15,
            5,7,13,7,13,15,
            4,6,12,6,12,14,

            0,4,8,4,8,12,
            1,5,9,5,9,13,
            2,6,10,6,10,14,
            3,7,11,7,11,15
    ];
}
const camera={
    position:[0,0,3,0],
    velocity:10,
}
function createBuffer(M){
  var m=[];
for(let i=0; i<M.length; ++i){
  for(let j=0; j<M[i].length; ++j){
    m.push(M[j][i]);
  }
}
return new Float32Array(m);
}
const canvas=document.querySelector(".canvas");
async function main(){
// webgpuコンテキストの取得
const context = canvas.getContext('webgpu');

// deviceの取得
const g_adapter = await navigator.gpu.requestAdapter();
const g_device = await g_adapter.requestDevice();

//デバイスを割り当て
const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: g_device,
  format: presentationFormat,
  alphaMode: 'opaque'
});

//深度テクスチャ
var depthTexture;
if (!depthTexture ||
        depthTexture.width !== canvas.width ||
        depthTexture.height !== canvas.height){
      if (depthTexture) {
        depthTexture.destroy();
      }
      depthTexture =g_device.createTexture({
    size: [canvas.width,canvas.width],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
});
}

const quadVertexSize = 4*4; // Byte size of a vertex.
const quadPositionOffset = 0;  // Byte offset of quad vertex position attribute

generateVertex();

function render(){
    const vertWGSL=`
struct Uniforms {
  projectionMatrix : mat4x4<f32>,
  translateMatrix:mat4x4<f32>
}
@binding(0) @group(0) var<uniform> uniforms : Uniforms;

struct VertexOutput {
  @builtin(position) Position : vec4<f32>,
  //フラグメントでのもの
  @location(0) fragColor : vec4<f32>,
}
fn geoprod(u:array<f32,16>,v:array<f32,16>)->array<f32,16>{
let r:f32=u[0];
let x:f32=u[1];
let y:f32=u[2];
let z:f32=u[3];
let w:f32=u[4];
let xy:f32=u[5];
let yz:f32=u[6];
let xz:f32=u[7];
let xw:f32=u[8];
let yw:f32=u[9];
let zw:f32=u[10];
let xyz:f32=u[11];
let yzw:f32=u[12];
let xzw:f32=u[13];
let xyw:f32=u[14];
let xyzw:f32=u[15];
let R:f32=v[0];
let X:f32=v[1];
let Y:f32=v[2];
let Z:f32=v[3];
let W:f32=v[4];
let XY:f32=v[5];
let YZ:f32=v[6];
let XZ:f32=v[7];
let XW:f32=v[8];
let YW:f32=v[9];
let ZW:f32=v[10];
let XYZ:f32=v[11];
let YZW:f32=v[12];
let XZW:f32=v[13];
let XYW:f32=v[14];
let XYZW:f32=v[15];
return array<f32,16>(
            (r*R)+(x*X)+(y*Y)+(z*Z)+(w*W)-(xy*XY)-(yz*YZ)-(xz*XZ)-(xw*XW)-(yw*YW)-(zw*ZW)-(xyz*XYZ)-(yzw*YZW)-(xzw*XZW)-(xyw*XYW)+(xyzw*XYZW),
            (r*X)+(x*R)-(y*XY)-(z*XZ)-(w*XW)+(xy*Y)-(yz*XYZ)+(xz*Z)+(xw*W)-(yw*XYW)-(zw*XZW)-(xyz*YZ)+(yzw*XYZW)-(xzw*ZW)-(xyw*YW)-(xyzw*YZW),
            (r*Y)+(x*XY)+(y*R)-(z*YZ)-(w*YW)-(xy*X)+(yz*Z)+(xz*XYZ)+(xw*XYW)+(yw*W)-(zw*YZW)+(xyz*XZ)-(yzw*ZW)-(xzw*XYZW)+(xyw*XW)+(xyzw*XZW),
            (r*Z)+(x*XZ)+(y*YZ)+(z*R)-(w*ZW)-(xy*XYZ)-(yz*Y)-(xz*X)+(xw*XZW)+(yw*YZW)+(zw*W)-(xyz*XY)+(yzw*YW)+(xzw*XW)+(xyw*XYZW)-(xyzw*XYW),
            (r*W)+(x*XW)+(y*YW)+(z*ZW)+(w*R)-(xy*XYW)-(yz*YZW)-(xz*XZW)-(xw*X)-(yw*Y)-(zw*Z)-(xyz*XYZW)-(yzw*YZ)-(xzw*XZ)-(xyw*XY)+(xyzw*XYZ),
            (r*XY)+(x*Y)-(y*X)+(z*XYZ)+(w*XYW)+(xy*R)+(yz*XZ)-(xz*YZ)-(xw*YW)+(yw*XW)-(zw*XYZW)+(xyz*Z)+(yzw*XZW)-(xzw*YZW)+(xyw*W)-(xyzw*ZW),
            (r*YZ)+(x*XYZ)+(y*Z)-(z*Y)+(w*YZW)-(xy*XZ)+(yz*R)+(xz*XY)-(xw*XYZW)-(yw*ZW)+(zw*YW)+(xyz*X)+(yzw*W)+(xzw*XYW)-(xyw*XZW)-(xyzw*XW),
            (r*XZ)+(x*Z)-(y*XYZ)-(z*X)+(w*XZW)+(xy*YZ)-(yz*XY)+(xz*R)-(xw*ZW)+(yw*XYZW)+(zw*XW)-(xyz*Y)-(yzw*XYW)+(xzw*W)+(xyw*YZW)+(xyzw*YW),
            (r*XW)+(x*W)-(y*XYW)-(z*XZW)-(w*X)+(xy*YW)-(yz*XYZW)+(xz*ZW)+(xw*R)-(yw*XY)-(zw*XZ)-(xyz*YZW)+(yzw*XYZ)-(xzw*Z)-(xyw*Y)-(xyzw*YZ),
            (r*YW)+(x*XYW)+(y*W)-(z*YZW)-(w*Y)-(xy*XW)+(yz*ZW)+(xz*XYZW)+(xw*XY)+(yw*R)-(zw*YZ)+(xyz*XZW)-(yzw*Z)-(xzw*XYZ)+(xyw*X)+(xyzw*XZ),
            (r*ZW)+(x*XZW)+(y*YZW)+(z*W)-(w*Z)-(xy*XYZW)-(yz*YW)-(xz*XW)+(xw*XZ)+(yw*YZ)+(zw*R)-(xyz*XYW)+(yzw*Y)+(xzw*X)+(xyw*XYZ)-(xyzw*XY),
            (r*XYZ)+(x*YZ)-(y*XZ)+(z*XY)-(w*XYZW)+(xy*Z)+(yz*X)-(xz*Y)+(xw*YZW)-(yw*XZW)+(zw*XYW)+(xyz*R)-(yzw*XW)+(xzw*YW)-(xyw*ZW)+(xyzw*W),
            (r*YZW)+(x*XYZW)+(y*ZW)-(z*YW)+(w*YZ)-(xy*XZW)+(yz*W)+(xz*XYW)-(xw*XYZ)-(yw*Z)+(zw*Y)+(xyz*XW)+(yzw*R)+(xzw*XY)-(xyw*XZ)-(xyzw*X),
            (r*XZW)+(x*ZW)-(y*XYZW)-(z*XW)+(w*XZ)+(xy*YZW)-(yz*XYW)+(xz*W)-(xw*Z)+(yw*XYZ)+(zw*X)-(xyz*YW)-(yzw*XY)+(xzw*R)+(xyw*YZ)+(xyzw*Y),
            (r*XYW)+(x*YW)-(y*XW)+(z*XYZW)+(w*XY)+(xy*W)+(yz*XZW)-(xz*YZW)-(xw*Y)+(yw*X)-(zw*XYZ)+(xyz*ZW)+(yzw*XZ)-(xzw*YZ)+(xyw*R)-(xyzw*Z),
            (r*XYZW)+(x*YZW)-(y*XZW)+(z*XYW)-(w*XYZ)+(xy*ZW)+(yz*XW)-(xz*YW)+(xw*YZ)-(yw*XZ)+(zw*XY)+(xyz*W)-(yzw*X)+(xzw*Y)-(xyw*Z)+(xyzw*R)
        );
}
@vertex
fn main(@location(0) position: vec4<f32>,@location(1) color: vec4<f32>,@location(2) pos: vec4<f32>,@location(3) scale: vec4<f32>,@location(4) z1: vec4<f32>,@location(5) z2: vec4<f32>) -> VertexOutput {
  var output : VertexOutput;
  var p=position;
  //4,0クリフォード代数
  var z = array<f32, 16>(
  z1.x,0,0,0,
  0,z1.y,z1.z,z1.w,
  z2.y,z2.z,z2.w,0,
  0,0,0,z2.x);
  var iz = array<f32, 16>(z1.x,0,0,0,0,-z1.y,-z1.z,-z1.w,-z2.y,-z2.z,-z2.w,0,0,0,0,z2.x);
  p.x=p.x*scale.x;
  p.y=p.y*scale.y;
  p.z=p.z*scale.z;
  p.w=p.w*scale.w;
  p+=pos;
  //4次元回転
  var P=array<f32,16>(0,p.x,p.y,p.z,p.w,0,0,0,0,0,0,0,0,0,0,0);
  P=geoprod(geoprod(iz,P),z);
  p=vec4<f32>(P[1],P[2],P[3],P[4]);
var c=array<f32,16>(${z[0]},${z[1]},${z[2]},${z[3]},${z[4]},${z[5]},${z[6]},${z[7]},${z[8]},${z[9]},${z[10]},${z[11]},${z[12]},${z[13]},${z[14]},${z[15]});
var ci=array<f32,16>(${z[0]},${z[1]},${z[2]},${z[3]},${z[4]},${-z[5]},${-z[6]},${-z[7]},${-z[8]},${-z[9]},${-z[10]},${-z[11]},${-z[12]},${-z[13]},${-z[14]},${z[15]});
//カメラ制御
P=array<f32,16>(0,p.x,p.y,p.z,p.w,0,0,0,0,0,0,0,0,0,0,0);
  P=geoprod(geoprod(ci,P),c);
  var v=vec4<f32>(P[1],P[2],P[3],P[4]);
  //３次元への投影
  let dist:f32=${dw};
  if(dist-v.w>0.1){
  v.y=v.y*dist/(dist-v.w);
  v.x=v.x*dist/(dist-v.w);
  v.z=v.z*dist/(dist-v.w);
  v.w=1;
  }else{
  v.y=v.y*dist*10;
  v.x=v.x*dist*10;
  v.z=v.z*dist*10;
  v.w=1;
  }
  //いつもの
  output.Position = uniforms.projectionMatrix*uniforms.translateMatrix*v;
  output.fragColor = color;
  return output;
}
`;
const fragWGSL=`
@fragment
fn main(@location(0) fragColor: vec4<f32>) -> @location(0) vec4<f32> {
  return fragColor;
}
`;
generateInstance();
//頂点配列
const quadVertexArray = new Float32Array(vertex);
// 頂点データを作成.
const verticesBuffer = g_device.createBuffer({
  size: quadVertexArray.byteLength,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
new Float32Array(verticesBuffer.getMappedRange()).set(quadVertexArray);
verticesBuffer.unmap();

//インデックス配列
const quadIndexArray = new Uint16Array(generateIndex());
const indicesBuffer = g_device.createBuffer({
  size: quadIndexArray.byteLength,
  usage: GPUBufferUsage.INDEX,
  mappedAtCreation: true,
});
//マップしたバッファデータをセッ
new Uint16Array(indicesBuffer.getMappedRange()).set(quadIndexArray);
indicesBuffer.unmap();

//Uniformバッファ
const uniformBufferSize = 4*16*2;
  const uniformBuffer = g_device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
var bufferPosition=0;
//透視投影変換行列を与える。
const p=createBuffer(mat4.perspectiveMatrix(4*Math.PI/5,1,100,1));
g_device.queue.writeBuffer(
  uniformBuffer,
  //バッファのバイト位置
  bufferPosition,
  //データ
  p.buffer,
  //データの位置
  p.byteOffset,
  //大きさ
  p.byteLength
);
bufferPosition+=p.byteLength;
//平行移動を与える。
const ct=createBuffer(mat4.translate(new vector(camera.position[0],camera.position[1],camera.position[2])));
g_device.queue.writeBuffer(
  uniformBuffer,
  //バッファのバイト位置
  bufferPosition,
  //データ
  ct.buffer,
  //データの位置
  ct.byteOffset,
  //大きさ
  ct.byteLength
);
bufferPosition+=ct.byteLength;

//レンダーパイプラインの設定
const pipeline = g_device.createRenderPipeline({
  layout: 'auto',
  vertex: {
    //頂点シェーダーのWGSLをここに。
    module: g_device.createShaderModule({
      code: vertWGSL,
    }),
    //エントリーポイントとなる関数を指定
    entryPoint: 'main',
    //バッファデータの設定
    buffers: [
      {
        // 配列の要素間の距離をバイト単位で指定します。
        arrayStride: quadVertexSize,

        // 頂点バッファの属性を指定します。
        attributes: [
          {
            // position
            shaderLocation: 0, // @location(0) in vertex shader
            offset: quadPositionOffset,
            format: 'float32x4',
          },
        ],
      },
        {//インスタンス
       	  arrayStride: 4 * 20,//4byte*dim4
          
          // バッファをインスタンスごとに参照することを意味します。
          stepMode: 'instance',
          
          attributes: [
            {
			  shaderLocation: 2,
              offset: 0,
              format: 'float32x4'//dim=4
            },
            {
            // color
            shaderLocation: 1,
            offset: 4*4,
            format: 'float32x4',
            },
            {
            // scale
            shaderLocation: 3,
            offset: 4*8,
            format: 'float32x4',
            },
              //m0
            {
            shaderLocation: 4,
            offset: 4*12,
            format: 'float32x4',
            },
              {
            shaderLocation: 5,
            offset: 4*16,
            format: 'float32x4',
            }
          ]
        }
    ],
  },
  fragment: {
    //フラグメントシェーダーのWGSLをここに。
    module: g_device.createShaderModule({
      code: fragWGSL,
    }),
    entryPoint: 'main',
    //レンダー先(canvas)のフォーマットを指定
    targets: [
      {
        format: presentationFormat,
      },
    ],
  },
  primitive: {
    topology: 'triangle-list',
  },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus',
    },
});

//インスタンスバッファを作成
const instancePositions=new Float32Array(inst);
  const instancesBuffer = g_device.createBuffer({
    size: instancePositions.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(instancesBuffer.getMappedRange()).set(instancePositions);
  instancesBuffer.unmap();

//バインドグループを作成
const bindGroup = g_device.createBindGroup({
  layout: pipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0, // @binding(0) in shader
      resource: {
        buffer: uniformBuffer,
      },
    },
  ],
});
//コマンドバッファの作成
const commandEncoder = g_device.createCommandEncoder();
//レンダーパスの設定
const textureView = context.getCurrentTexture().createView();
  const renderPassDescriptor/*: GPURenderPassDescriptor */= {
    colorAttachments: [
      {
        view: textureView,
        //画面clearの色
        clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 0.0 },
        //まずclearする。
        loadOp: 'clear',
        //命令が終われば、状態を保持
        storeOp: 'store',
      },
    ],
      //深度テスター
    depthStencilAttachment: {
      view: depthTexture.createView(),
      depthClearValue: 1.0,
      depthLoadOp: 'clear',
      depthStoreOp: 'store',
    },
  };
  const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
  //GPUに命令を設定

  //レンダーパイプラインを与える
  passEncoder.setPipeline(pipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.setVertexBuffer(0, verticesBuffer);
  passEncoder.setIndexBuffer(indicesBuffer, 'uint16');
  passEncoder.setVertexBuffer(1, instancesBuffer);
  passEncoder.drawIndexed(quadIndexArray.length,Math.floor(instancePositions.length/20));
  // レンダーパスコマンドシーケンスの記録を完了する。
  passEncoder.end();
  //命令を発行
  g_device.queue.submit([commandEncoder.finish()]);
    requestAnimationFrame(render);
    translate();
}
    render();
}
//簡単...?
main();
var key="";
canvas.addEventListener("contextmenu",()=>{
    event.preventDefault();
});
window.addEventListener("keydown",e=>{
    key=e.code;
    if(key=="Digit1"){
        if(e.shiftKey){
            rotate(1);
        }else{
            rotate(-1);
        }
    }
    if(key=="Digit2"){
        if(e.shiftKey){
            rotate(2);
        }else{
            rotate(-2);
        }
    }
    if(key=="Digit3"){
        if(e.shiftKey){
            rotate(3);
        }else{
            rotate(-3);
        }
    }
    if(key=="Digit4"){
        if(e.shiftKey){
            rotate(4);
        }else{
            rotate(-4);
        }
    }
    if(key=="Digit5"){
        if(e.shiftKey){
            rotate(5);
        }else{
            rotate(-5);
        }
    }
    if(key=="Digit6"){
        if(e.shiftKey){
            rotate(6);
        }else{
            rotate(-6);
        }
    }
});
window.addEventListener("keyup",e=>{
    key="";
});
//描画毎に行う処理
function translate(){
    const cv=camera.velocity/60;
    if(key=="KeyW"){
        camera.position[2]-=cv;
    }
    if(key=="KeyS"){
        camera.position[2]+=cv;
    }
    if(key=="KeyN"){
        dw-=0.1;
    }
    if(key=="KeyM"){
        dw+=0.1;
    }
    if(key=="KeyL"){
        angle.yw+=0.1;
    }
    animation();
    if(rollval>0){
    for(const o of obj){
        if(o.roll!=-100){
            const val=spd*Math.PI/180;
            if(o.roll==1){
            o.z=clifford.product4D(o.z,[
        Math.cos(val),0,0,0,
        0,Math.sin(val),0,0,
        0,0,0,0,
        0,0,0,0]);
            }
            if(o.roll==2){
            o.z=clifford.product4D(o.z,[
        Math.cos(val),0,0,0,
        0,0,0,Math.sin(val),
        0,0,0,0,
        0,0,0,0]);
            }
            if(o.roll==-1){
            o.z=clifford.product4D(o.z,[
        Math.cos(-val),0,0,0,
        0,Math.sin(-val),0,0,
        0,0,0,0,
        0,0,0,0]);
            }
            if(o.roll==-2){
            o.z=clifford.product4D(o.z,[
        Math.cos(-val),0,0,0,
        0,0,0,Math.sin(-val),
        0,0,0,0,
        0,0,0,0]);
            }
            if(o.roll==3){
            o.z=clifford.product4D(o.z,[
        Math.cos(val),0,0,0,
        0,0,Math.sin(val),0,
        0,0,0,0,
        0,0,0,0]);
            }
            if(o.roll==-3){
            o.z=clifford.product4D(o.z,[
        Math.cos(-val),0,0,0,
        0,0,Math.sin(-val),0,
        0,0,0,0,
        0,0,0,0]);
            }
            if(o.roll==4){
            o.z=clifford.product4D(o.z,[
        Math.cos(val),0,0,0,
        0,0,0,0,
        Math.sin(val),0,0,0,
        0,0,0,0]);
            }
            if(o.roll==-4){
            o.z=clifford.product4D(o.z,[
        Math.cos(-val),0,0,0,
        0,0,0,0,
        Math.sin(-val),0,0,0,
        0,0,0,0]);
            }
            if(o.roll==5){
            o.z=clifford.product4D(o.z,[
        Math.cos(val),0,0,0,
        0,0,0,0,
        0,Math.sin(val),0,0,
        0,0,0,0]);
            }
            if(o.roll==-5){
            o.z=clifford.product4D(o.z,[
        Math.cos(-val),0,0,0,
        0,0,0,0,
        0,Math.sin(-val),0,0,
        0,0,0,0]);
            }
            if(o.roll==6){
            o.z=clifford.product4D(o.z,[
        Math.cos(val),0,0,0,
        0,0,0,0,
        0,0,Math.sin(val),0,
        0,0,0,0]);
            }
            if(o.roll==-6){
            o.z=clifford.product4D(o.z,[
        Math.cos(-val),0,0,0,
        0,0,0,0,
        0,0,Math.sin(-val),0,
        0,0,0,0]);
            }
    }
        }
        rollval--;
        if(0>=rollval){
            for(const o of obj){
            //o.angle[k]=o.toAngle[k];
                    o.roll=-100;
            }
            rollval=0;
        }
        }
}
function deleteObj(seed){
    let id=obj.findIndex(e=>e.seed==seed);
    if(seed!=-1){
    let res=obj.slice(0,id);
    let A=obj.slice(id+1,obj.length);
        for(let k=0; k<A.length; ++k){
            res.push(A[k]);
        }
        obj=res;
    }
}
function createCube(x,y,z,w,scales,color,info){
    if(!info){
        info=[];
    }
    if(!color){
        color=[Math.random(),Math.random(),Math.random()];
    }
    if(!scales){
        scales=[1,1,1,1];
    }
    obj.push({position:[x,y,z,w],color:color,vol:scales,seed:Math.random(),info:info,angle:[0,0,0,0,0,0],toAngle:[0,0,0,0,0,0],pholder:[x,y,z,w],roll:-100,z:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]});
}
function find(seed){
    return obj.findIndex(e=>e.seed==seed);
}
function rubic4D(center){
    const sa=2.5;
    createCube(center[0],center[1],center[2],center[3],[sa,sa,sa,sa],[0.5,0.5,0.5]);
  for(let i=-1; i<=1; ++i){
    for(let j=-1; j<=1; ++j){
      for(let k=-1; k<=1; ++k){
        for(let l=-1; l<=1; ++l){
        const d=1.2;
        if(!(i==0 && j==0 && k==0 && l==0)){
        const C=vec.sum(center,[i*size*d,j*size*d,k*size*d,l*size*d]);
            const c={x:C[0],y:C[1],z:C[2],w:C[3]};
            const s=size/2;
            const c1=[1,1,1];//白
            const c2=[1,1,0];//黃
            const c3=[0,0,1];//青
            const c4=[0,0.8,0];//緑
            const c5=[1,0,0];//赤
            const c6=[1,0.5,0];//オレンジ
            const c7=[0.5,1,0.5];//ミント
            const c8=[1,0,1];//紫
            //八胞体を作ろう
            var X=0.01;
            //左右胞
            if(i==-1){
            createCube(c.x-s,c.y,c.z,c.w,[0,1,1,1],c3,[i,j,k,l]);
            }
            if(i==1){
            createCube(c.x+s,c.y,c.z,c.w,[0,1,1,1],c4,[i,j,k,l]);
            }
            //上下胞
            if(j==-1){
            createCube(c.x,c.y-s,c.z,c.w,[1,0,1,1],c1,[i,j,k,l]);
            }
            if(j==1){
            createCube(c.x,c.y+s,c.z,c.w,[1,0,1,1],c2,[i,j,k,l]);
            }
            //前後胞
            if(k==-1){
            createCube(c.x,c.y,c.z-s,c.w,[1,1,0,1],c5,[i,j,k,l]);
            }
            if(k==1){
            createCube(c.x,c.y,c.z+s,c.w,[1,1,0,1],c6,[i,j,k,l]);
            }
            //世界胞
            if(l==-1){
            createCube(c.x,c.y,c.z,c.w-s,[1+X,1-X,1-X,0],c7,[i,j,k,l]);
            }
            if(l==1){
            createCube(c.x,c.y,c.z,c.w+s,[1+X,1-X,1-X,0],c8,[i,j,k,l]);
            }
        }
      }
      }
    }
  }
}
var mon=0;
window.addEventListener("mousedown",e=>{
    if(e.button!=0){
        if(e.button==2){
        mon=2;
        }
        if(e.button==4){
        mon=3;
        }
    }else{
    mon=1;
    }
});
window.addEventListener("mouseup",e=>{
    mon=0;
});
window.addEventListener("mousemove",e=>{
    const v=new vector(e.movementX/200,e.movementY/200);
    if(mon==2 || key=="KeyE"){
        z=clifford.product4D(z,[
        Math.cos(v.y),0,0,0,
        0,0,Math.sin(v.y),0,
        0,0,0,0,
        0,0,0,0]);
        z=clifford.product4D(z,[
        Math.cos(-v.x),0,0,0,
        0,0,0,Math.sin(-v.x),
        0,0,0,0,
        0,0,0,0]);
    }
});
window.addEventListener("wheel",e=>{
    if(mon==2 || key=="KeyE"){
    z=clifford.product4D(z,[
        Math.cos(e.deltaY/200),0,0,0,
        0,0,0,0,
        0,0,Math.sin(e.deltaY/200),0,
        0,0,0,0]);
    }else{
    camera.position[2]+=e.deltaY/400;
    }
});
function rotate(id,instant){
    const r=Math.PI/2;
    const obid=findObj(m);
    if(obid!=-1 && rollval<=0){
        rollval=45/spd;
    //正xy回転  
    if(id==1 && Math.abs(m[2])+Math.abs(m[3])>0){
        for(const o of obj){
            if(o.info[2]==m[2] && o.info[3]==m[3]){
                var a=0;
                var b=1;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=-o.info[b];
                o.info[b]=hold;
            }
        }
    }
        if(id==-1 && Math.abs(m[2])+Math.abs(m[3])>0){
        for(const o of obj){
            if(o.info[2]==m[2] && o.info[3]==m[3]){
                var a;
                var b;
                a=0;
                b=1;
                var hold=o.info[a];
                o.roll=id;
                o.info[a]=o.info[b];
                o.info[b]=-hold;
            }
        }
    }
        if(id==2 && Math.abs(m[1])+Math.abs(m[3])>0){
        for(const o of obj){
            if(o.info[1]==m[1] && o.info[3]==m[3]){
                var a=0;
                var b=2;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=-o.info[b];
                o.info[b]=hold;
            }
        }
    }
        if(id==-2 && Math.abs(m[1])+Math.abs(m[3])>0){
        for(const o of obj){
            if(o.info[1]==m[1] && o.info[3]==m[3]){
                var a=0;
                var b=2;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=o.info[b];
                o.info[b]=-hold;
            }
        }
    }
        if(id==3 && Math.abs(m[0])+Math.abs(m[3])>0){
        for(const o of obj){
            if(o.info[0]==m[0] && o.info[3]==m[3]){
                var a=1;
                var b=2;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=-o.info[b];
                o.info[b]=hold;
            }
        }
    }
        if(id==-3 && Math.abs(m[0])+Math.abs(m[3])>0){
        for(const o of obj){
            if(o.info[0]==m[0] && o.info[3]==m[3]){
                var a=1;
                var b=2;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=o.info[b];
                o.info[b]=-hold;
            }
        }
    }
        if(id==-4 && Math.abs(m[1])+Math.abs(m[2])>0){
        for(const o of obj){
            if(o.info[1]==m[1] && o.info[2]==m[2]){
                var a=0;
                var b=3;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=o.info[b];
                o.info[b]=-hold;
            }
        }
    }
        if(id==4 && Math.abs(m[1])+Math.abs(m[2])>0){
        for(const o of obj){
            if(o.info[1]==m[1] && o.info[2]==m[2]){
                var a=0;
                var b=3;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=-o.info[b];
                o.info[b]=hold;
            }
        }
    }
        if(id==-5 && Math.abs(m[0])+Math.abs(m[2])>0){
        for(const o of obj){
            if(o.info[0]==m[0] && o.info[2]==m[2]){
                var a=1;
                var b=3;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=o.info[b];
                o.info[b]=-hold;
            }
        }
    }
        if(id==5 && Math.abs(m[0])+Math.abs(m[2])>0){
        for(const o of obj){
            if(o.info[0]==m[0] && o.info[2]==m[2]){
                var a=1;
                var b=3;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=-o.info[b];
                o.info[b]=hold;
            }
        }
    }
        if(id==-6 && Math.abs(m[0])+Math.abs(m[1])>0){
        for(const o of obj){
            if(o.info[0]==m[0] && o.info[1]==m[1]){
                var a=2;
                var b=3;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=o.info[b];
                o.info[b]=-hold;
            }
        }
    }
        if(id==6 && Math.abs(m[0])+Math.abs(m[1])>0){
        for(const o of obj){
            if(o.info[0]==m[0] && o.info[1]==m[1]){
                var a=2;
                var b=3;
                const hold=o.info[a];
                o.roll=id;
                o.info[a]=-o.info[b];
                o.info[b]=hold;
            }
        }
    }
    }
}
function findObj(p){
    return obj.findIndex(e=>e.info.join()==p.join());
}
function animation(){
}
function test(){
    const Q=qmath.polar(1,new vector(Math.random(),Math.random(),Math.random()),Math.random()*Math.PI);
    console.log(qmath.rotationMatrix(Q,Q));
    console.log(qmath.rotationMatrix3(Q));
}
function rq(v,an,an2){
    const p=new quaternion(v[3],v[0],v[1],v[2]);
    const ql=qmath.polar(1,new vector(1,0,0),-an/2);
    const qr=qmath.polar(1,new vector(1,0,0),an/2);
    const res=qmath.f(qmath.f(ql*p)*qr);
    return [res.i,res.j,res.k,res.real];
}
function axis(x,y,z,w){
  createCube2(x+size,y,z,w,[1,0,0],[10*size,size,size,size]);
  createCube2(x,y+size,z,w,[0,1,0],[size,10*size,size,size]);
  createCube2(x,y,z+size,w,[0,0,1],[size,size,10*size,size]);
  createCube2(x,y,z,w+size,[1,1,0],[size,size,size,10*size]);
}
function createCube2(x,y,z,w,color,scale,tag,subPosition){
  if(!subPosition){
    subPosition=[0,0,0,0];
  }
  if(!tag){
    tag="global";
  }
  if(!color){
    color=[Math.random(),Math.random(),Math.random()];
  }
  if(!scale){
    scale=[size,size,size,size];
  }
    obj.push({position:[x,y,z,w],seed:Math.random(),color:color,vol:scale,tag:tag,z:[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]});
}
function shuffle3D(ite){
    for(let k=0; k<ite; ++k){
    rotate(math.randSign()*math.randInt(1,3),true);
    }
}
function shuffle4D(){
}
rubic4D([0,0,0,0]);
//shuffle3D(100);