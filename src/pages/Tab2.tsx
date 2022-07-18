import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import { useEffect, useState } from 'react';
import ExploreContainer from '../components/ExploreContainer';
import postAccounts from '../api/postAccounts';
import './Tab2.css';


const Tab2: React.FC = () => {
  const [latest, setLatest] = useState("Latest");

  useEffect(()=>{
    

    const getBlock:Function = async () => {
      const accounts: any = await postAccounts();
      // setLatest(accounts)
      console.log(accounts);

      if(accounts.result){
        setLatest(accounts.result)
      }
    }

    getBlock();
  
  }, [])
  
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Wallet</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{latest}</IonTitle>
          </IonToolbar>
        </IonHeader>
        <ExploreContainer name={latest} />
      </IonContent>
    </IonPage>
  );
};

export default Tab2;
