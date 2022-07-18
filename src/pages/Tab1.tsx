import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';
import ExploreContainer from '../components/ExploreContainer';
import './Tab1.css';

const Tab1: React.FC = () => {
  return (
    <IonPage>
      {/* <IonHeader>
        <IonToolbar>
          <IonTitle>Tab 14</IonTitle>
        </IonToolbar>
      </IonHeader> */}
      <IonContent fullscreen>
        {/* <iframe src="http://3.104.94.74:3000/" title="google" style={{
          width: '100%',
          height: '100%'
        }}/> */}
        <iframe src="https://igquacker.com/" title="google" style={{
          width: '100%',
          height: '100%'
        }}/>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;
