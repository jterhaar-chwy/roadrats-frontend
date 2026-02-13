import Head from 'next/head';
import Image from 'next/image';
import { useState } from 'react';
import styles from '@/styles/index.module.scss';

import { KibApplicationManager, KibApplicationPortal } from '@chewy/kib-application-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { KibCarousel, KibCarouselItem } from '@chewy/kib-carousels-react';
import { KibContainer } from '@chewy/kib-layout-react';
import { KibModal } from '@chewy/kib-overlays-react';
import { KibProductCard } from '@chewy/kib-product-react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';

export default function Index() {
  const [isOpen, setOpen] = useState(false);
  return (
    <>
      <Head>
        <title>Chirp Application</title>
      </Head>
      <KibApplicationManager>
        <KibContainer>
          <h1>Chirp Application Template</h1>
          <p>Use this application template as a starting point on creating apps with Chirp!</p>
          <KibSectionHeading
            heading="Carousel Example"
            subheading="This carousel has product cards!"
            className={styles.example}
          >
            <KibCarousel>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Hill's Science Diet Adult Large Breed Dry Dog Food, 35-lb bag"
                        src="https://img.chewy.com/is/catalog/114165_MAIN._AC_SS190_V1605828408_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Taste of the Wild Pacific Stream Grain-Free Dry Dog Food, 28-lb bag"
                        src="https://img.chewy.com/is/catalog/154549_MAIN._AC_SS190_V1601338854_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Blue Buffalo Life Protection Formula Adult Chicken & Brown Rice Recipe Dry Dog Food, 30-lb bag"
                        src="https://img.chewy.com/is/catalog/46861_MAIN._AC_SS190_V1628730083_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Purina ONE SmartBlend Lamb & Rice Adult Formula Dry Dog Food, 40-lb bag"
                        src="https://img.chewy.com/is/catalog/126355_MAIN._AC_SS190_V1634331685_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Blue Buffalo Wilderness Chicken Recipe Grain-Free Dry Dog Food"
                        src="https://img.chewy.com/is/catalog/46872_MAIN._AC_SS190_V1598116576_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="American Journey Salmon & Sweet Potato Recipe Grain-Free Dry Dog Food, 24-lb bag"
                        src="https://img.chewy.com/is/catalog/108423_MAIN._AC_SS190_V1486751013_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Purina Pro Plan Veterinary Diets FortiFlora Powder Digestive Supplement for Dogs, 30 count"
                        src="https://img.chewy.com/is/catalog/65072_MAIN._AC_SS190_V1581619132_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Purina Pro Plan Adult Sensitive Skin & Stomach Salmon & Rice Formula Dry Dog Food, 30-lb bag"
                        src="https://img.chewy.com/is/catalog/101143_MAIN._AC_SS190_V1621989822_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Taste of the Wild High Prairie Grain-Free Dry Dog Food, 28-lb bag"
                        src="https://img.chewy.com/is/catalog/154551_MAIN._AC_SS190_V1601342154_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Purina Pro Plan Sport All Life Stages Performance 30/20 Chicken & Rice Formula Dry Dog Food"
                        src="https://img.chewy.com/is/catalog/131886_MAIN._AC_SS190_V1600001773_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
              <KibCarouselItem>
                <a href="#">
                  <KibProductCard
                    canvas={
                      <Image
                        alt="Purina Pro Plan Adult Chicken & Rice Formula Dry Cat Food"
                        src="https://img.chewy.com/is/catalog/67932_MAIN._AC_SS190_V1598029573_.jpg"
                        width={190}
                        height={190}
                      />
                    }
                  />
                </a>
              </KibCarouselItem>
            </KibCarousel>
          </KibSectionHeading>

          <KibSectionHeading heading="Application Portal Example" subheading="Open a modal!">
            <KibButtonNew onClick={() => setOpen(true)}>Open Modal</KibButtonNew>
          </KibSectionHeading>

          <KibApplicationPortal
            type="overlay"
            render={({ activate, deactivate }) => (
              <KibModal
                title="Modal Title"
                open={isOpen}
                onOpen={() => activate()}
                onBeforeClose={() => deactivate()}
                onClose={() => setOpen(false)}
              >
                Lorem ipsum dolor, sit amet consectetur adipisicing elit. Modi voluptatibus iusto id
                saepe unde nemo voluptatem rem illum, eius numquam iste ipsam temporibus omnis
                placeat, asperiores ratione laborum atque! Cumque.
              </KibModal>
            )}
          />
        </KibContainer>
      </KibApplicationManager>
    </>
  );
}
