import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Star, ChevronLeft, ChevronRight, CheckCircle, Users, Heart, Shield, Award } from 'lucide-react';
import axios from 'axios';
import styles from './HomePage.module.css';
import Header from '../components/Header';
import banner1 from '../assets/banner1.png';
import banner2 from '../assets/banner2.png';
import banner3 from '../assets/banner3.jpg';
import banner4 from '../assets/banner4.png';
import banner5 from '../assets/banner5.png';
import banner6 from '../assets/banner6.png';
import AwardIcon from '../assets/award.gif';
import about from '../assets/about.png';
import Chat from '../components/Chat';
import ChatBot from '../components/ChatBot';
import BookAppointment from "../components/BookAppointment";
import { notification } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import ReviewModal from '../components/ReviewModal';
import { jwtDecode } from "jwt-decode";

function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [openWidget, setOpenWidget] = useState(null);
  const [dentists, setDentists] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [isOpenBookAppointmentModal, setIsOpenBookAppointmentModal] = useState(false);
  const [api, contextHolder] = notification.useNotification();
  const [mode, setMode] = useState('');
  const [isOpenReviewModal, setIsOpenReviewModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const navigate = useNavigate();

  const handleGoToServiceType = (type) => {
    navigate("/service", { state: { type } });
  };

  const openNotification = (type, detailMessage = "") => {
    if (type === "success") {
      api.open({
        message: "Action successful!",
        description: detailMessage,
        showProgress: true,
        pauseOnHover: true,
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
      });
    } else {
      api.open({
        message: "Action failed!",
        description: detailMessage,
        showProgress: true,
        pauseOnHover: true,
        icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      });
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decoded = jwtDecode(token);
    setCurrentUserId(decoded.userId);
    Promise.all([
      axios.get("http://localhost:5000/dentistProfile/get-all-dentist-profile", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get("http://localhost:5000/review/get-highlight-reviews", {
        headers: { Authorization: `Bearer ${token}` },
      })
    ])
      .then(([dentistRes, reviewRes]) => {
        setDentists(dentistRes.data.profiles || []);
        setReviews(reviewRes.data.reviews || []);
      })
      .catch((err) => console.error("Error fetching data:", err));
  }, []);

  const hasMyReview = useMemo(
    () =>
      !!currentUserId &&
      reviews.some(r => r.customer && r.customer._id === currentUserId),
    [reviews, currentUserId]
  );

  const handleReview = () => {
    setIsOpenReviewModal(true);
    setMode('create');
  };

  const handleReviewSuccess = (newReview) => {
    const rating = Number(newReview.rating);

    setReviews((prev) => {
      if (rating === 5) {
        const filtered = prev.filter((r) => r._id !== newReview._id);
        return [newReview, ...filtered];
      }
      return prev;
    });

    setIsOpenReviewModal(false);
  };

  const loopedReviews = useMemo(
    () => (reviews && reviews.length > 0 ? [...reviews, ...reviews, ...reviews, ...reviews] : []),
    [reviews]
  );


  const services = [
    {
      type: "Treatment",
      desc: "Comprehensive treatments for cavities, gum disease, and other oral problems to restore comfort and protect your teeth.",
      bg: require("../assets/Treatment.png"),
    },
    {
      type: "Check-up",
      desc: "Regular dental check-ups help detect oral health issues early, ensuring timely treatment and maintaining a healthy smile.",
      bg: require("../assets/Checkup.png"),
    },
    {
      type: "Aesthetics",
      desc: "Enhance your smile with whitening, veneers, and cosmetic dentistry solutions designed for a brighter and more confident look.",
      bg: require("../assets/Aesthetics.png"),
    },
    {
      type: "Surgery",
      desc: "Safe and professional oral surgeries such as wisdom tooth extraction, implants, and minor surgical procedures.",
      bg: require("../assets/Surgery.png"),
    },
    {
      type: "Orthodontics",
      desc: "Correct misaligned teeth and bite issues with braces or clear aligners for long-term dental health and aesthetics.",
      bg: require("../assets/Orthodontics.png"),
    },
  ];

  const renderStars = (rating) => {
    return (
      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? styles.starFilled : styles.starEmpty}
          />
        ))}
      </div>
    );
  };

  const slides = [banner1, banner2, banner3, banner4, banner5, banner6];
  const nextSlide = useCallback(() => setCurrentSlide((prev) => (prev + 1) % slides.length), [slides.length]);
  const prevSlide = useCallback(() => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  return (
    <div className={styles.container}>
      {contextHolder}
      <Header />
      <Chat
        isOpen={openWidget === 'messenger'}
        onToggle={() => setOpenWidget(prev => prev === 'messenger' ? null : 'messenger')}
        isOtherOpen={openWidget === 'chatbot'} />
      <ChatBot
        isOpen={openWidget === 'chatbot'}
        onToggle={() => setOpenWidget(prev => prev === 'chatbot' ? null : 'chatbot')}
        isOtherOpen={openWidget === 'messenger'} />
      <section className={styles.bannerSection}>
        {slides.map((src, index) => (
          <div key={index} className={`${styles.bannerSlide} ${index === currentSlide ? styles.bannerSlideActive : index < currentSlide ? styles.bannerSlidePrev : styles.bannerSlideNext}`}>
            <div className={styles.bannerImage} style={{ backgroundImage: `url(${src})` }}>
              <div className={styles.bannerOverlay}></div>
            </div>
          </div>
        ))}
        <button className={`${styles.bannerNavButton} ${styles.bannerNavPrev}`} onClick={prevSlide}><ChevronLeft /></button>
        <button className={`${styles.bannerNavButton} ${styles.bannerNavNext}`} onClick={nextSlide}><ChevronRight /></button>
        <div className={styles.bannerDots}>
          {slides.map((_, i) => (
            <span
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`${styles.bannerDot} ${i === currentSlide ? styles.bannerDotActive : styles.bannerDotInactive}`}
            ></span>
          ))}
        </div>
      </section>

      <section className={styles.aboutSection} id="about">
        <div className={styles.aboutContainer}>
          <div className={styles.aboutGrid}>
            <div>
              <h2 className={styles.aboutTitle}>Why Choose <span className={styles.aboutTitleHighlight}>Gentle Care Dental</span></h2>
              <p className={styles.aboutDescription}>Our dental clinic is equipped with modern facilities and experienced professionals to give you the best oral health care.</p>
              <div className={styles.aboutStats}>
                <div className={styles.aboutStatCard}>
                  <div className={styles.aboutStatNumber}>15+</div>
                  <div className={styles.aboutStatLabel}>Years Experience</div>
                </div>
                <div className={styles.aboutStatCard}>
                  <div className={styles.aboutStatNumber}>5K+</div>
                  <div className={styles.aboutStatLabel}>Happy Patients</div>
                </div>
              </div>
              <div className={styles.aboutFeatures}>
                {['Modern Tools', 'Certified Dentists', 'Flexible Hours'].map((feat) => (
                  <div key={feat} className={styles.aboutFeature}><CheckCircle size={18} /> {feat}</div>
                ))}
              </div>
            </div>
            <div className={styles.aboutImageContainer}>
              <img src={about} alt="About" className={styles.aboutImage} />
              <div className={styles.aboutBadge}>
                <div className={styles.aboutBadgeNumber}>100%</div>
                <div className={styles.aboutBadgeText}>Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.servicesSection} id="services">
        <div className={styles.servicesContainer}>
          <div className={styles.servicesHeader}>
            <h2 className={styles.servicesTitle}>Our <span className={styles.servicesTitleHighlight}>Services</span></h2>
            <p className={styles.servicesDescription}>Comprehensive dental services for all ages, from preventive to cosmetic care.</p>
          </div>
          <div className={styles.servicesGrid}>
            {services.map((service, i) => (
              <div
                key={i}
                className={styles.serviceCard}
                style={{ "--bg-image": `url(${service.bg})` }}
                onClick={() => handleGoToServiceType(service.type)}
              >
                <img src={AwardIcon} alt="Award icon" className={styles.serviceIcon} />
                <h3 className={styles.serviceTitle}>{service.type}</h3>
                <p className={styles.serviceDescription}>{service.desc}</p>
                <a href="/service" className={styles.serviceLink}>
                  Learn More
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.doctorsSection} id="doctors">
        <div className={styles.doctorsContainer}>
          <div className={styles.doctorsHeader}>
            <h2 className={styles.doctorsTitle}>Meet Our <span className={styles.doctorsTitleHighlight}>Experts</span></h2>
            <p className={styles.doctorsDescription}>Experienced dentists ready to take care of your smile.</p>
          </div>
          <div className={styles.doctorsGrid}>
            {dentists.map((dentist, i) => (
              <div key={i} className={styles.doctorCard}>
                <div className={styles.doctorImageContainer}>
                  <img src={dentist.dentistId.avatar} alt={'dentistavatar'} className={styles.doctorImage} />
                  <div className={styles.doctorImageOverlay}></div>
                </div>
                <div className={styles.doctorInfo}>
                  <h3 className={styles.doctorName}>{dentist.dentistId.fullName}</h3>
                  <div className={styles.doctorSpecialty}>{dentist.specialization}</div>
                  <div className={styles.doctorExperience}>{dentist.experienceYears} years experience</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewModal isOpen={isOpenReviewModal} mode={mode} onClose={() => setIsOpenReviewModal(false)} openNotification={openNotification} onSuccess={handleReviewSuccess} />
      <section className={styles.testimonialsSection} id="testimonials">
        <div className={styles.testimonialsContainer}>
          <div className={styles.testimonialsHeader}>
            <h2 className={styles.testimonialsTitle}>
              What Our <span className={styles.testimonialsTitleHighlight}>Customers Say</span>
            </h2>
            <p className={styles.testimonialsDescription}>Real stories from happy smiles.</p>
            {!hasMyReview && (
              <button className={styles.createReviewBtn} onClick={handleReview}>
                <img
                  width="24"
                  height="24"
                  src="https://img.icons8.com/material/24/228BE6/filled-sent.png"
                  alt="filled-sent"
                />
                Send a Review
              </button>
            )}
          </div>

          {loopedReviews.length > 0 ? (
            <div className={styles.testimonialsCarousel}>
              <div className={styles.testimonialsWrapper}>
                <div className={styles.testimonialsTrack}>
                  {loopedReviews.map((review, i) => (
                    <div key={review._id || i} className={styles.testimonialCard}>
                      <div className={styles.testimonialRating}>
                        {renderStars(review.rating)}
                      </div>
                      <p className={styles.testimonialComment}>
                        &quot;{review.comment}&quot;
                      </p>
                      <div className={styles.testimonialFooter}>
                        <div className={styles.testimonialName}>
                          Customer: {review.customer.fullName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={styles.testimonialsTrack} aria-hidden="true">
                  {loopedReviews.map((review, i) => (
                    <div key={`dup-${review._id || i}`} className={styles.testimonialCard}>
                      <div className={styles.testimonialRating}>
                        {renderStars(review.rating)}
                      </div>
                      <p className={styles.testimonialComment}>
                        &quot;{review.comment}&quot;
                      </p>
                      <div className={styles.testimonialFooter}>
                        <div className={styles.testimonialName}>
                          Customer: {review.customer.fullName}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.testimonialsGradientLeft}></div>
              <div className={styles.testimonialsGradientRight}></div>
            </div>
          ) : (
            <p className={styles.testimonialsDescription}>
              There are no reviews yet.
            </p>
          )}
        </div>
      </section>


      <BookAppointment isOpen={isOpenBookAppointmentModal} onClose={() => setIsOpenBookAppointmentModal(false)} openNotification={openNotification} />
      <section className={styles.ctaSection}>
        <div className={styles.ctaContainer}>
          <h2 className={styles.ctaTitle}>Ready for a Brighter Smile?</h2>
          <p className={styles.ctaDescription}>Book your appointment now and experience top-quality dental care.</p>
          <div className={styles.ctaButtons}>
            <button onClick={() => setIsOpenBookAppointmentModal(true)} className={styles.ctaButtonPrimary}>Book appointment</button>
          </div>
        </div>
      </section>

      <section className={styles.about}>
        <div className={styles.aboutContent}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              About Gental Care Dental
            </h2>
            <p className={styles.sectionDescription}>
              We are committed to providing high quality dental services with dedicated care and the most advanced technology.
            </p>
          </div>

          <div className={styles.featuresGrid}>
            {[
              {
                icon: <Heart className={styles.featureIcon} />,
                title: "Dedicated Care",
                description: "Putting patient comfort and safety first"
              },
              {
                icon: <Award className={styles.featureIcon} />,
                title: "Professional",
                description: "Experienced and well-trained team of doctors"
              },
              {
                icon: <Shield className={styles.featureIcon} />,
                title: "Absolute Safety",
                description: "Strict adherence to hygiene and safety standards"
              },
              {
                icon: <Users className={styles.featureIcon} />,
                title: "Family Service",
                description: "Dental care for all ages"
              }
            ].map((feature, index) => (
              <div key={index} className={styles.featureCard}>
                <div className={styles.featureContent}>
                  <div className={styles.featureIconContainer}>
                    {feature.icon}
                  </div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerGrid}>
            <div>
              <div className={styles.footerBrand}>Gentle Care Dental</div>
              <p className={styles.footerDescription}>Your trusted dental clinic for a healthy smile.</p>
              <div className={styles.footerSocial}>
                {['fb', 'tw', 'ig'].map((net, i) => (
                  <div key={i} className={styles.footerSocialIcon}>{net.toUpperCase()}</div>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.footerSectionTitle}>Quick Links</div>
              <div className={styles.footerList}>
                {['Services', 'Doctors', 'Testimonials'].map((item) => (
                  <a key={item} className={styles.footerListItem} href={`#${item.toLowerCase()}`}>{item}</a>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.footerSectionTitle}>Contact</div>
              <div className={styles.footerContactList}>
                <div className={styles.footerContactItem}><Phone size={18} /> 0909 999 999</div>
                <div className={styles.footerContactItem}><Mail size={18} /> hello@GentleCareDental.com</div>
                <div className={styles.footerContactItem}><MapPin size={18} /> 123 Smile Ave, Hanoi</div>
              </div>
            </div>
            <div>
              <div className={styles.footerSectionTitle}>Newsletter</div>
              <p className={styles.footerNewsletter}>Get updates about new services and offers.</p>
              <div className={styles.footerNewsletterForm}>
                <input type="email" className={styles.footerNewsletterInput} placeholder="Your email" />
                <button className={styles.footerNewsletterButton}>Subscribe</button>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>© 2025 Gentle Care Dental. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
