var dice;
var variable=1;
var variable1=1;
var num;
sides=5;
var z1,z2,z3,z4;
var token1=true;
var token2=true;
var user1=true;
var user2=true;
function Dice(){
  dice= Math.floor(Math.random()*sides)+1;
  num=document.getElementById("print");
  if(dice==1 || dice==2 || dice==3 || dice==4 && token1==true){
    num.innerHTML="Number"+":"+dice;
   }
   else if(dice==5){
    num.innerHTML="Number"+":"+"8";
   }
}

 x1=["🐵"];
 o1=["🦁"];
function playerone(){
    if( dice==5 || dice==4 || variable==4 && token1==true ){
        z=document.getElementById("e3").value="🐵";

        z1=document.getElementById("e6").value=x1;
        variable++;
        token1=false;
     }
     if(variable>5){
      z=document.getElementById("e3").value=" ";
      z=document.getElementById("e6").value=" ";
      z1=document.getElementById("print").innerHTML="no tokens for player one";
      user1=true;
    }
}
function playertwo(){
  if( dice==5 || dice==4 ||variable1==4 && token2==true ){
    z=document.getElementById("a3").value="🦁";
    z1=document.getElementById("e7").value=o1;
    variable1++;
    token2=false;
 }
 if(variable1>5){
  z=document.getElementById("a3").value=" ";
  z=document.getElementById("e7").value=" ";
  z1=document.getElementById("print").innerHTML="no tokens for player two";
   user2=true;
}
}
function box23(){
        if(dice==1 && token1==false){
     e4=document.getElementById("e4").value=x1;
      z=document.getElementById("e3").value=" ";
      z1=document.getElementById("e6").value=" ";
      token1=true;

      if(x1==x1){
        z=document.getElementById("e3").value=x1+" "+x1;
      }

    }
   else if(dice==2 && token1==false){  
        e5=document.getElementById("e5").value=x1;
        z=document.getElementById("e3").value=" ";
        z1=document.getElementById("e6").value=" ";
        token1=true;
    }
    else if(dice==3 && token1==false){
      z=document.getElementById("e3").value=" ";
     d5=document.getElementById("d5").value=x1;
     z1=document.getElementById("e6").value=" ";
     token1=true;
    }
    else  if(dice==4 && token1==false){
      z=document.getElementById("e3").value=" ";
      c5=document.getElementById("c5").value=x1;  
      z1=document.getElementById("e6").value=" ";
      token1=true;
    }
    else if(dice==5 && token1==false){
      z=document.getElementById("e3").value=" ";
      a3=document.getElementById("a3").value=x1;
      z1=document.getElementById("e6").value=" ";
      token1=true;
    }

    else if(dice==1 && token2==false){
      e4=document.getElementById("e4").value=x1;
       z=document.getElementById("e3").value=" ";
       z1=document.getElementById("e6").value=" ";
       token2=true;
     }
    else if(dice==2 && token2==false){  
         e5=document.getElementById("e5").value=x1;
         z=document.getElementById("e3").value=" ";
         z1=document.getElementById("e6").value=" ";
         token2=true;
     }
     else if(dice==3 && token2==false){
       z=document.getElementById("e3").value=" ";
      d5=document.getElementById("d5").value=x1;
      z1=document.getElementById("e6").value=" ";
      token2=true;
     }
     else  if(dice==4 && token2==false){
       z=document.getElementById("e3").value=" ";
       c5=document.getElementById("c5").value=x1;  
       z1=document.getElementById("e6").value=" ";
       token2=true;
     }
     else if(dice==5 && token2==false){
       z=document.getElementById("e3").value=" ";
       a3=document.getElementById("a3").value=x1;
       z1=document.getElementById("e6").value=" ";
       token2=true;
     }
}

function box3(){
  if(dice==1 && token2==false){
   z=document.getElementById("a2").value=o1; 
    a3=document.getElementById("a3").value=" ";
    z1=document.getElementById("e7").value=" ";
    token2=true;
  }
  else if(dice==2 && token2==false){
   z=document.getElementById("a1").value=o1;
    a3=document.getElementById("a3").value=" ";
    z1=document.getElementById("e7").value=" ";
    token2=true;
  }
  else if(dice==3 && token2==false){
    a3=document.getElementById("a3").value=" ";
   z=document.getElementById("b1").value=o1;
   z1=document.getElementById("e7").value=" ";
    token2=true;
  }
  else if(dice==4 && token2==false){
    a3=document.getElementById("a3").value=" ";
   z=document.getElementById("c1").value=o1;
   z1=document.getElementById("e7").value=" ";
    token2=true;
  }
  else if(dice==5 && token2==false){
    a3=document.getElementById("a3").value=" ";
   z=document.getElementById("e3").value=o1;
   z1=document.getElementById("e7").value=" ";
    token2=true;
  }
}